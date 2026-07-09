"""
Unit tests for the RAG pipeline components — testing actual production
functions with proper mocking of module-level side effects.
"""

import re
from unittest.mock import MagicMock, patch
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest


# ── Fixtures: import production functions with side-effects mocked ──

@pytest.fixture(scope="session")
def strip_boilerplate():
    """Import the actual _strip_boilerplate from process_data.py.

    The function is standalone (only depends on `re`), so we can import
    it without worrying about process_data's module-level I/O side effects.
    """
    import importlib.util
    import sys

    spec = importlib.util.spec_from_file_location(
        "process_data_test",
        "scripts/process_data.py",
    )
    mod = importlib.util.module_from_spec(spec)
    sys.modules["process_data_test"] = mod
    # suppress top-level I/O side effects by mocking os/shutil/fitz/glob
    with (
        patch("os.makedirs"),
        patch("shutil.copy"),
        patch("glob.glob", return_value=[]),
        patch("os.walk", return_value=[]),
        patch("builtins.open"),
    ):
        spec.loader.exec_module(mod)
    return mod._strip_boilerplate

# ── Tests: _strip_boilerplate ────────────────────────────────────────

class TestStripBoilerplate:
    """Tests for process_data._strip_boilerplate — removes HTML nav noise."""

    def test_removes_header_noise(self, strip_boilerplate):
        sample = (
            "Product - Kdipower info@kdipower.com +91 85959 40069 "
            "Facebook Instagram Linkedin Home About Us Our Products "
            "X Control Cables Home Control Cables "
            "Introduction KDI Power Control Cables represent a wide range..."
        )
        result = strip_boilerplate(sample)
        assert "Facebook" not in result
        assert "Instagram" not in result
        assert "X Control Cables" not in result
        assert "Introduction" in result
        assert "KDI Power Control Cables" in result

    def test_removes_header_with_ampersand(self, strip_boilerplate):
        """Section names containing '&' (e.g. 'House Wires & Cables')."""
        sample = (
            "Facebook Instagram Linkedin Home About Us "
            "X House Wires & Cables Home House Wires & Cables "
            "Introduction KDI Power HomeCab-FR wires..."
        )
        result = strip_boilerplate(sample)
        assert "Facebook" not in result
        assert "HomeCab-FR" in result

    def test_removes_footer_noise(self, strip_boilerplate):
        """Everything from 'USEFULL LINKS' onward should be stripped."""
        sample = (
            "Some real content about cables. "
            "Facebook Instagram Linkedin USEFULL LINKS About Us Our Products "
            "CONTACT US 1243, Block H Copyright © 2026 by KDI Power"
        )
        result = strip_boilerplate(sample)
        assert "USEFULL LINKS" not in result
        assert "Copyright" not in result
        assert "1243, Block H" not in result
        assert "Some real content about cables" in result

    def test_removes_cta_buttons(self, strip_boilerplate):
        """"Enquire Now" and "Connect Us" buttons should be stripped."""
        sample = (
            "This is a great cable. Enquire Now "
            "Connect Us "
            "Reach out to our sales and customer support team for expert wires and cables solutions. "
            "Thank you."
        )
        result = strip_boilerplate(sample)
        assert "Enquire Now" not in result
        assert "Connect Us" not in result
        assert "This is a great cable" in result
        assert "Thank you" in result

    def test_preserves_clean_content(self, strip_boilerplate):
        text = "KDI Power manufactures XLPE and PVC armoured cables."
        assert strip_boilerplate(text) == text

    def test_empty_input(self, strip_boilerplate):
        assert strip_boilerplate("") == ""
        assert strip_boilerplate("   ") == ""

    def test_realistic_product_page(self, strip_boilerplate):
        """Full example combining header, content, and footer noise."""
        sample = (
            "House Wires & Cables - Kdipower Kdipower info@kdipower.com +91 85959 40069 "
            "Facebook Instagram Linkedin Home About Us Our Products "
            "X House Wires & Cables Home House Wires & Cables "
            "Introduction KDI Power HomeCab-FR wires are designed for safe "
            "and reliable wiring in residential and commercial buildings. "
            "They are manufactured using 99.97% electrolytic grade copper. "
            "Enquire Now Connect Us "
            "KDI Power manufactures high-quality electrical wires and cables in India. "
            "Facebook Instagram Linkedin USEFULL LINKS About Us Our Products "
            "CONTACT US 1243, Block H, DSIDC Industrial Area "
            "Copyright © 2026 by KDI Power"
        )
        result = strip_boilerplate(sample)
        # Content preserved
        assert "KDI Power HomeCab-FR wires" in result
        assert "99.97%" in result
        assert "electrolytic grade copper" in result
        # Noise removed
        assert "Facebook" not in result
        assert "Instagram" not in result
        assert "USEFULL LINKS" not in result
        assert "Copyright" not in result
        assert "Enquire Now" not in result
        assert "Connect Us" not in result


# ── Run ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    pytest.main([__file__, "-v"])

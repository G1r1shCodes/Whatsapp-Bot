-- One-time data migration: normalize legacy/imported product category names
-- to the canonical set used by the app (see db.CATEGORY_ALIASES).
-- Run this once in the Supabase SQL editor.
--
-- Canonical categories:
--   Power Cables, House Wires, Rubber Cable, Control Cables,
--   Aerial Bunched Cable, Instrumentation Wires

UPDATE products SET category = 'Power Cables' WHERE category IN (
    'Power Cable', 'HT Cables', 'Solar Cables', 'Wind Power Cables',
    'Insulated Cables', 'Armoured Cables', 'Copper Armoured Cables',
    'Copper Unarmoured Cables', 'Copper XLPE Armoured Cables',
    'Copper XLPE Unarmoured Cables', 'Aluminium XLPE Armoured Cables',
    'Aluminium Unarmoured Cables'
);

UPDATE products SET category = 'House Wires' WHERE category IN (
    'Electrical Wires', 'Industrial Wires', 'Multi Core Wires',
    'Triple Coating Cables', 'General Cables'
);

UPDATE products SET category = 'Rubber Cable' WHERE category IN (
    'Flexible Cables', 'Submersible Cables'
);

UPDATE products SET category = 'Instrumentation Wires' WHERE category = 'Thermocouple Cables';

/**
 * AURA RESIDENCES — Architectural & Customization Configuration
 * Coordinate Convention:
 *   +X = East, -X = West, -Z = North, +Z = South (Main Entrance), +Y = Elevation
 *   Building Footprint: X in [-10, 10] (20m), Z in [-7.5, 7.5] (15m)
 */
window.EstateApp = window.EstateApp || {};

window.EstateApp.CONFIG = {
  building: {
    name: 'AURA RESIDENCES',
    subtitle: 'Architectural Tower & Spatial Configurator',
    width: 20,      // X: -10 to +10
    depth: 15,      // Z: -7.5 to +7.5
    podiumHeight: 0.36,
    floorHeight: 3.5,
    slabThickness: 0.24,
    wallThicknessExt: 0.22,
    wallThicknessInt: 0.14
  },

  compassDirections: [
    { id: 'N',  label: 'North',      azimuth: 0,   short: 'N'  },
    { id: 'NE', label: 'North-East', azimuth: 45,  short: 'NE' },
    { id: 'E',  label: 'East',       azimuth: 90,  short: 'E'  },
    { id: 'SE', label: 'South-East', azimuth: 135, short: 'SE' },
    { id: 'S',  label: 'South',      azimuth: 180, short: 'S'  },
    { id: 'SW', label: 'South-West', azimuth: 225, short: 'SW' },
    { id: 'W',  label: 'West',       azimuth: 270, short: 'W'  },
    { id: 'NW', label: 'North-West', azimuth: 315, short: 'NW' }
  ],

  timePresets: [
    { id: 'dawn',   label: 'Dawn',        hour: 6.25,  azimuthOffset: 0, icon: '🌅' },
    { id: 'morn',   label: 'Morning',     hour: 9.0,   azimuthOffset: 0, icon: '☀️' },
    { id: 'noon',   label: 'High Noon',   hour: 12.5,  azimuthOffset: 0, icon: '🔆' },
    { id: 'golden', label: 'Golden Hour', hour: 17.25, azimuthOffset: 0, icon: '🌇' },
    { id: 'dusk',   label: 'Blue Dusk',   hour: 18.75, azimuthOffset: 0, icon: '🌆' },
    { id: 'moon',   label: 'Full Moon',   hour: 22.5,  azimuthOffset: 0, icon: '🌕' }
  ],

  customizations: {
    flooring: {
      label: 'Flooring & Surfaces',
      description: ' Living, dining, kitchen & bedroom primary flooring',
      options: [
        {
          id: 'herringbone_oak',
          name: 'Nordic Herringbone Oak',
          tag: 'Standard',
          delta: 0,
          swatch: '#c8a276',
          roughness: 0.42,
          metalness: 0.04,
          texKey: 'herringbone_oak'
        },
        {
          id: 'calacatta_marble',
          name: 'Calacatta Gold Marble',
          tag: '+$6,800',
          delta: 6800,
          swatch: '#ece9e2',
          roughness: 0.14,
          metalness: 0.08,
          texKey: 'calacatta_marble'
        },
        {
          id: 'smoked_walnut',
          name: 'Smoked American Walnut',
          tag: '+$3,400',
          delta: 3400,
          swatch: '#5e402c',
          roughness: 0.36,
          metalness: 0.05,
          texKey: 'smoked_walnut'
        },
        {
          id: 'venetian_terrazzo',
          name: 'Venetian Stone Terrazzo',
          tag: '+$4,900',
          delta: 4900,
          swatch: '#d6d0c8',
          roughness: 0.24,
          metalness: 0.05,
          texKey: 'venetian_terrazzo'
        },
        {
          id: 'travertine_slate',
          name: 'Honed Limestone Slate',
          tag: '+$2,600',
          delta: 2600,
          swatch: '#9c958b',
          roughness: 0.58,
          metalness: 0.03,
          texKey: 'travertine_slate'
        }
      ]
    },

    windows: {
      label: 'Windows & Glazing',
      description: 'Architectural mullion geometry, frame finish & solar tint',
      options: [
        {
          id: 'minimal_obsidian',
          name: 'Slim Matte Black · Clear Low-E',
          tag: 'Standard',
          delta: 0,
          swatch: '#27323d',
          frameColor: 0x1e2228,
          frameMetalness: 0.7,
          frameRoughness: 0.32,
          glassColor: 0xcceeff,
          glassOpacity: 0.28,
          mullionStyle: 'minimal'
        },
        {
          id: 'champagne_bronze',
          name: 'Champagne Anodized · Solar Bronze',
          tag: '+$5,200',
          delta: 5200,
          swatch: '#b5936b',
          frameColor: 0xb8976c,
          frameMetalness: 0.82,
          frameRoughness: 0.25,
          glassColor: 0xd9b38c,
          glassOpacity: 0.34,
          mullionStyle: 'transom'
        },
        {
          id: 'french_ivory',
          name: 'European Grid · Classic Ivory',
          tag: '+$4,100',
          delta: 4100,
          swatch: '#e8e4dc',
          frameColor: 0xeae6de,
          frameMetalness: 0.2,
          frameRoughness: 0.45,
          glassColor: 0xdaf0ff,
          glassOpacity: 0.26,
          mullionStyle: 'french_grid'
        },
        {
          id: 'titanium_cobalt',
          name: 'Brushed Titanium · Acoustic Sky Tint',
          tag: '+$6,400',
          delta: 6400,
          swatch: '#5d84a6',
          frameColor: 0x7c858e,
          frameMetalness: 0.88,
          frameRoughness: 0.22,
          glassColor: 0x6fb5e8,
          glassOpacity: 0.38,
          mullionStyle: 'double_vertical'
        }
      ]
    },

    kitchen: {
      label: 'Modular Kitchen',
      description: 'Cabinetry style, chef island configuration, countertop & backsplash',
      options: [
        {
          id: 'milano_charcoal',
          name: 'Milano Charcoal & Waterfall Island',
          tag: 'Signature',
          delta: 0,
          swatch: '#2e3238',
          cabinetColor: 0x282c32,
          upperColor: 0x353a42,
          counterTex: 'calacatta_marble',
          backsplashTex: 'calacatta_marble',
          hardwareColor: 0xd4a853,
          hasIsland: true,
          hasPendants: true,
          shakerStyle: false
        },
        {
          id: 'scandi_sage',
          name: 'Scandi Sage & Fluted Oak Island',
          tag: '+$3,800',
          delta: 3800,
          swatch: '#7b8f7e',
          cabinetColor: 0x6f8473,
          upperColor: 0xc8a276,
          counterTex: 'herringbone_oak',
          backsplashTex: 'subway_tile',
          hardwareColor: 0x1e2226,
          hasIsland: true,
          hasPendants: true,
          shakerStyle: true
        },
        {
          id: 'nordic_alabaster',
          name: 'Nordic Alabaster Minimalist',
          tag: '+$2,200',
          delta: 2200,
          swatch: '#f0eee9',
          cabinetColor: 0xeeece6,
          upperColor: 0xf5f4f0,
          counterTex: 'venetian_terrazzo',
          backsplashTex: 'venetian_terrazzo',
          hardwareColor: 0x9aa3ad,
          hasIsland: false,
          hasPendants: false,
          shakerStyle: false
        },
        {
          id: 'tuscany_walnut',
          name: 'Tuscany Walnut & Champagne Brass',
          tag: '+$7,500',
          delta: 7500,
          swatch: '#6b472e',
          cabinetColor: 0x5c3c26,
          upperColor: 0x452c1b,
          counterTex: 'travertine_slate',
          backsplashTex: 'hex_brass_tile',
          hardwareColor: 0xd9b166,
          hasIsland: true,
          hasPendants: true,
          shakerStyle: true
        }
      ]
    },

    walls: {
      label: 'Interior Walls & Trim',
      description: 'Architectural wall plaster & acoustic tone',
      options: [
        { id: 'alabaster',  name: 'Gallery Warm Alabaster', tag: 'Standard', delta: 0,    swatch: '#f3efe8', color: 0xf3efe8, roughness: 0.85 },
        { id: 'greige',     name: 'Roman Greige Limewash',  tag: '+$1,800',  delta: 1800, swatch: '#dad2c5', color: 0xdad2c5, roughness: 0.9  },
        { id: 'botanical',  name: 'Muted Sage Plaster',     tag: '+$2,100',  delta: 2100, swatch: '#cfd8ce', color: 0xcfd8ce, roughness: 0.86 },
        { id: 'terracotta', name: 'Warm Sand Blush',        tag: '+$2,100',  delta: 2100, swatch: '#e6d5c9', color: 0xe6d5c9, roughness: 0.88 }
      ]
    },

    furniture: {
      label: 'Furniture & Upholstery',
      description: 'Curated interior living, dining & bedroom palette',
      options: [
        { id: 'boucle_cream', name: 'Minimalist Cream Bouclé & Oak',  tag: 'Curated', delta: 0,    swatch: '#e8e2d5', fabric: 0xe8e2d5, accent: 0x8c6d46, wood: 0xc49c6e },
        { id: 'cognac_exec',  name: 'Mid-Century Cognac & Walnut',    tag: '+$4,500', delta: 4500, swatch: '#9c5a34', fabric: 0x9c5a34, accent: 0x2c3e50, wood: 0x593a24 },
        { id: 'coastal_ash',  name: 'Nordic Slate Linen & Pale Ash',  tag: '+$3,200', delta: 3200, swatch: '#647687', fabric: 0x647687, accent: 0xd4a853, wood: 0xd6c2a5 }
      ]
    }
  },

  /**
   * 6 Distinct Floor Layouts (Index 0 = Floor 1 ... Index 5 = Floor 6)
   * Every floor tiles [-10..10] x [-7.5..7.5] cleanly (300.0 m² total).
   */
  floors: [
    // =========================================================================
    // FLOOR 1: GRAND ARRIVAL LOBBY & AMENITY PODIUM
    // =========================================================================
    {
      level: 1,
      code: 'F1',
      name: 'Grand Lobby & Wellness Club',
      layoutType: 'Layout A · Podium Amenities',
      unitsSummary: 'Concierge Atrium · Co-Working · Gym · Tasting Kitchen',
      accentColor: '#d4a853',
      rooms: [
        { id: 'f1_core',    name: 'Lift & Stair Core',     unit: 'Core',    category: 'core',    x: -2,  z: -7.5, w: 4, d: 3.5 },
        { id: 'f1_mail',    name: 'Parcel & Concierge',    unit: 'Amenity', category: 'service', x: -4,  z: -7.5, w: 2, d: 3.5 },
        { id: 'f1_spa',     name: 'Spa Washrooms',         unit: 'Amenity', category: 'bath',    x: 2,   z: -7.5, w: 2, d: 3.5 },
        { id: 'f1_lobby',   name: 'Grand Reception Lobby', unit: 'Lobby',   category: 'lobby',   x: -4,  z: -4.0, w: 8, d: 11.5, furniturePreset: 'grand_lobby' },
        { id: 'f1_cafe',    name: 'Residents Cafe Lounge', unit: 'Amenity', category: 'living',  x: -10, z: -7.5, w: 6, d: 7.5,  furniturePreset: 'cafe_lounge' },
        { id: 'f1_cowork',  name: 'Co-Working Library',    unit: 'Amenity', category: 'study',   x: -10, z: 0.0,  w: 6, d: 7.5,  furniturePreset: 'coworking' },
        { id: 'f1_gym',     name: 'Fitness & Yoga Studio', unit: 'Amenity', category: 'gym',     x: 4,   z: -7.5, w: 6, d: 8.5,  furniturePreset: 'gym' },
        { id: 'f1_kitchen', name: 'Tasting Modular Kitchen', unit: 'Amenity', category: 'kitchen', x: 4, z: 1.0,  w: 6, d: 6.5,  furniturePreset: 'modular_kitchen_large' }
      ],
      doors: [
        { x: 0,    z: 7.5,  orient: 'H', width: 3.2, style: 'glass_double' }, // Main Building Entrance
        { x: -1.0, z: -4.0, orient: 'H', width: 1.1, style: 'elevator' },
        { x: 1.0,  z: -4.0, orient: 'H', width: 1.1, style: 'elevator' },
        { x: -3.0, z: -4.0, orient: 'H', width: 0.95, style: 'wood' },
        { x: 3.0,  z: -4.0, orient: 'H', width: 0.95, style: 'wood' },
        { x: -4.0, z: -2.0, orient: 'V', width: 1.6, style: 'open' },
        { x: -4.0, z: 3.5,  orient: 'V', width: 1.6, style: 'glass' },
        { x: -7.0, z: 0.0,  orient: 'H', width: 1.4, style: 'open' },
        { x: 4.0,  z: -2.0, orient: 'V', width: 1.6, style: 'glass' },
        { x: 4.0,  z: 4.0,  orient: 'V', width: 1.6, style: 'open' }
      ],
      windows: [
        { x: -2.85, z: 7.5, orient: 'H', width: 1.8, sill: 0.15, head: 3.0 },
        { x: 2.85,  z: 7.5, orient: 'H', width: 1.8, sill: 0.15, head: 3.0 },
        { x: -7.0, z: 7.5,  orient: 'H', width: 4.2, sill: 0.25, head: 2.95 },
        { x: 7.0,  z: 7.5,  orient: 'H', width: 4.2, sill: 0.25, head: 2.95 },
        { x: -10,  z: 3.8,  orient: 'V', width: 4.4, sill: 0.25, head: 2.95 },
        { x: -10,  z: -3.8, orient: 'V', width: 4.4, sill: 0.25, head: 2.95 },
        { x: 10,   z: -3.2, orient: 'V', width: 5.2, sill: 0.25, head: 2.95 },
        { x: 10,   z: 4.2,  orient: 'V', width: 4.0, sill: 0.25, head: 2.95 },
        { x: -7.0, z: -7.5, orient: 'H', width: 3.8, sill: 0.6,  head: 2.85 },
        { x: 7.0,  z: -7.5, orient: 'H', width: 3.8, sill: 0.6,  head: 2.85 }
      ]
    },

    // =========================================================================
    // FLOOR 2: URBAN SMART SUITES — TWO 1BHKs + STUDIO (UNITS 201, 202, 203)
    // =========================================================================
    {
      level: 2,
      code: 'F2',
      name: 'Urban Smart Suites',
      layoutType: 'Layout B · Two 1BHKs + Studio',
      unitsSummary: 'Unit 201 (1BHK) · Unit 202 (Studio) · Unit 203 (1BHK)',
      accentColor: '#38bdf8',
      rooms: [
        { id: 'f2_core',   name: 'Lift & Stair Core',   unit: 'Core',     category: 'core',    x: -2,    z: -7.5, w: 4.0, d: 3.5 },
        { id: 'f2_lobby',  name: 'Floor 2 Lift Lobby',  unit: 'Common',   category: 'corridor',x: -2,    z: -4.0, w: 4.0, d: 3.0 },

        // Unit 201 (West 1BHK)
        { id: 'f2_201_liv', name: '201 Living & Dining', unit: 'Unit 201', category: 'living',  x: -6.5, z: -3.5, w: 4.5, d: 9.0, furniturePreset: 'living_dining' },
        { id: 'f2_201_kit', name: '201 Modular Kitchen', unit: 'Unit 201', category: 'kitchen', x: -6.5, z: -7.5, w: 4.5, d: 4.0, furniturePreset: 'modular_kitchen' },
        { id: 'f2_201_bed', name: '201 Master Bedroom',  unit: 'Unit 201', category: 'bedroom', x: -10,  z: -4.0, w: 3.5, d: 9.5, furniturePreset: 'bedroom' },
        { id: 'f2_201_bth', name: '201 En-Suite Bath',   unit: 'Unit 201', category: 'bath',    x: -10,  z: -7.5, w: 3.5, d: 3.5, furniturePreset: 'bathroom' },
        { id: 'f2_201_bal', name: '201 Sunset Balcony',  unit: 'Unit 201', category: 'balcony', x: -10,  z: 5.5,  w: 8.0, d: 2.0, isBalcony: true, furniturePreset: 'balcony' },

        // Unit 202 (Center Studio)
        { id: 'f2_202_stu', name: '202 Executive Studio', unit: 'Unit 202', category: 'bedroom', x: -2,  z: -1.0, w: 4.0, d: 6.5, furniturePreset: 'studio_suite' },
        { id: 'f2_202_bal', name: '202 South Loggia',     unit: 'Unit 202', category: 'balcony', x: -2,  z: 5.5,  w: 4.0, d: 2.0, isBalcony: true, furniturePreset: 'balcony_compact' },

        // Unit 203 (East 1BHK)
        { id: 'f2_203_liv', name: '203 Living Lounge',   unit: 'Unit 203', category: 'living',  x: 2.0,  z: -4.0, w: 4.5, d: 9.5, furniturePreset: 'living_dining' },
        { id: 'f2_203_kit', name: '203 Modular Kitchen', unit: 'Unit 203', category: 'kitchen', x: 2.0,  z: -7.5, w: 8.0, d: 3.5, furniturePreset: 'modular_kitchen_wide' },
        { id: 'f2_203_bed', name: '203 Master Bedroom',  unit: 'Unit 203', category: 'bedroom', x: 6.5,  z: -4.0, w: 3.5, d: 6.5, furniturePreset: 'bedroom' },
        { id: 'f2_203_bth', name: '203 Bathroom',        unit: 'Unit 203', category: 'bath',    x: 6.5,  z: 2.5,  w: 3.5, d: 3.0, furniturePreset: 'bathroom' },
        { id: 'f2_203_bal', name: '203 Sunrise Terrace', unit: 'Unit 203', category: 'balcony', x: 2.0,  z: 5.5,  w: 8.0, d: 2.0, isBalcony: true, furniturePreset: 'balcony' }
      ],
      doors: [
        { x: -1.0, z: -4.0, orient: 'H', width: 1.0, style: 'elevator' },
        { x: 1.0,  z: -4.0, orient: 'H', width: 1.0, style: 'elevator' },
        // Apartment Front Doors from Lift Lobby
        { x: -2.0, z: -2.3, orient: 'V', width: 1.05, style: 'wood' }, // Enter 201
        { x: 0.0,  z: -1.0, orient: 'H', width: 1.05, style: 'wood' }, // Enter 202
        { x: 2.0,  z: -2.3, orient: 'V', width: 1.05, style: 'wood' }, // Enter 203
        // 201 Interior
        { x: -4.2, z: -3.5, orient: 'H', width: 1.5, style: 'open' },  // 201 Living <-> Kitchen
        { x: -6.5, z: 1.0,  orient: 'V', width: 0.95, style: 'wood' }, // 201 Living <-> Bedroom
        { x: -8.2, z: -4.0, orient: 'H', width: 0.85, style: 'wood' }, // 201 Bedroom <-> Bath
        { x: -4.2, z: 5.5,  orient: 'H', width: 2.0, style: 'glass' }, // 201 Living -> Balcony
        // 202 Balcony
        { x: 0.0,  z: 5.5,  orient: 'H', width: 1.8, style: 'glass' },
        // 203 Interior
        { x: 4.2,  z: -4.0, orient: 'H', width: 1.6, style: 'open' },  // 203 Living <-> Kitchen
        { x: 6.5,  z: -1.0, orient: 'V', width: 0.95, style: 'wood' }, // 203 Living <-> Bed
        { x: 6.5,  z: 3.8,  orient: 'V', width: 0.85, style: 'wood' }, // 203 Living <-> Bath
        { x: 4.2,  z: 5.5,  orient: 'H', width: 2.0, style: 'glass' }  // 203 Living -> Balcony
      ],
      windows: [
        { x: -8.2, z: 5.5,  orient: 'H', width: 2.4, sill: 0.25, head: 2.9 },
        { x: -10,  z: 1.0,  orient: 'V', width: 3.8, sill: 0.55, head: 2.85 },
        { x: -10,  z: -5.8, orient: 'V', width: 1.8, sill: 1.2,  head: 2.75 },
        { x: -4.2, z: -7.5, orient: 'H', width: 2.6, sill: 0.95, head: 2.8 },
        { x: 6.0,  z: -7.5, orient: 'H', width: 4.2, sill: 0.95, head: 2.8 },
        { x: 10,   z: -1.0, orient: 'V', width: 3.6, sill: 0.55, head: 2.85 },
        { x: 10,   z: 4.0,  orient: 'V', width: 1.6, sill: 1.2,  head: 2.75 },
        { x: 8.2,  z: 5.5,  orient: 'H', width: 2.2, sill: 0.25, head: 2.9 }
      ]
    },

    // =========================================================================
    // FLOOR 3: TWIN 2BHK FAMILY RESIDENCES (UNITS 301 & 302)
    // =========================================================================
    {
      level: 3,
      code: 'F3',
      name: 'Twin 2BHK Family Wings',
      layoutType: 'Layout C · Dual 2BHK Residences',
      unitsSummary: 'Unit 301 (West 2BHK · 1,453 sf) · Unit 302 (East 2BHK · 1,453 sf)',
      accentColor: '#34d399',
      rooms: [
        { id: 'f3_core',    name: 'Lift & Stair Core',   unit: 'Core',     category: 'core',    x: -2,  z: -7.5, w: 4, d: 3.5 },
        { id: 'f3_lobby',   name: 'Floor 3 Lift Foyer',  unit: 'Common',   category: 'corridor',x: -2,  z: -4.0, w: 4, d: 4.0 },

        // Unit 301 (West 2BHK)
        { id: 'f3_301_din', name: '301 Dining & Foyer',  unit: 'Unit 301', category: 'dining',  x: -6,  z: -4.0, w: 4, d: 4.0, furniturePreset: 'dining' },
        { id: 'f3_301_kit', name: '301 Modular Kitchen', unit: 'Unit 301', category: 'kitchen', x: -6,  z: -7.5, w: 4, d: 3.5, furniturePreset: 'modular_kitchen' },
        { id: 'f3_301_liv', name: '301 Living Salon',    unit: 'Unit 301', category: 'living',  x: -6,  z: 0.0,  w: 6, d: 5.5, furniturePreset: 'living_large' },
        { id: 'f3_301_bd2', name: '301 Guest Bedroom',   unit: 'Unit 301', category: 'bedroom', x: -10, z: -7.5, w: 4, d: 5.0, furniturePreset: 'bedroom' },
        { id: 'f3_301_bth', name: '301 Family Bathroom', unit: 'Unit 301', category: 'bath',    x: -10, z: -2.5, w: 4, d: 2.5, furniturePreset: 'bathroom' },
        { id: 'f3_301_mst', name: '301 Master Bedroom',  unit: 'Unit 301', category: 'bedroom', x: -10, z: 0.0,  w: 4, d: 5.5, furniturePreset: 'bedroom_master' },
        { id: 'f3_301_bal', name: '301 West-South Deck', unit: 'Unit 301', category: 'balcony', x: -10, z: 5.5,  w: 10,d: 2.0, isBalcony: true, furniturePreset: 'balcony' },

        // Unit 302 (East 2BHK)
        { id: 'f3_302_din', name: '302 Dining & Foyer',  unit: 'Unit 302', category: 'dining',  x: 2,   z: -4.0, w: 4, d: 4.0, furniturePreset: 'dining' },
        { id: 'f3_302_kit', name: '302 Island Kitchen',  unit: 'Unit 302', category: 'kitchen', x: 2,   z: -7.5, w: 4, d: 3.5, furniturePreset: 'modular_kitchen' },
        { id: 'f3_302_liv', name: '302 Living Salon',    unit: 'Unit 302', category: 'living',  x: 0,   z: 0.0,  w: 6, d: 5.5, furniturePreset: 'living_large' },
        { id: 'f3_302_mst', name: '302 Master Suite',    unit: 'Unit 302', category: 'bedroom', x: 6,   z: -7.5, w: 4, d: 6.0, furniturePreset: 'bedroom_master' },
        { id: 'f3_302_bth', name: '302 Spa Bathroom',    unit: 'Unit 302', category: 'bath',    x: 6,   z: -1.5, w: 4, d: 3.0, furniturePreset: 'bathroom' },
        { id: 'f3_302_bd2', name: '302 Study Bedroom',   unit: 'Unit 302', category: 'bedroom', x: 6,   z: 1.5,  w: 4, d: 4.0, furniturePreset: 'bedroom' },
        { id: 'f3_302_bal', name: '302 East-South Deck', unit: 'Unit 302', category: 'balcony', x: 0,   z: 5.5,  w: 10,d: 2.0, isBalcony: true, furniturePreset: 'balcony' }
      ],
      doors: [
        { x: -1.0, z: -4.0, orient: 'H', width: 1.0, style: 'elevator' },
        { x: 1.0,  z: -4.0, orient: 'H', width: 1.0, style: 'elevator' },
        { x: -2.0, z: -2.0, orient: 'V', width: 1.05, style: 'wood' }, // Enter 301
        { x: 2.0,  z: -2.0, orient: 'V', width: 1.05, style: 'wood' }, // Enter 302
        // 301 Doors
        { x: -4.0, z: -4.0, orient: 'H', width: 1.5, style: 'open' },  // Dining <-> Kitchen
        { x: -4.0, z: 0.0,  orient: 'H', width: 2.2, style: 'open' },  // Dining <-> Living
        { x: -6.0, z: -3.2, orient: 'V', width: 0.95, style: 'wood' }, // Dining <-> Guest Bed
        { x: -6.0, z: -1.2, orient: 'V', width: 0.85, style: 'wood' }, // Dining <-> Bath
        { x: -6.0, z: 2.5,  orient: 'V', width: 0.95, style: 'wood' }, // Living <-> Master
        { x: -3.0, z: 5.5,  orient: 'H', width: 2.4, style: 'glass' }, // Living -> Balcony
        // 302 Doors
        { x: 4.0,  z: -4.0, orient: 'H', width: 1.5, style: 'open' },  // Dining <-> Kitchen
        { x: 4.0,  z: 0.0,  orient: 'H', width: 2.2, style: 'open' },  // Dining <-> Living
        { x: 6.0,  z: -2.8, orient: 'V', width: 0.95, style: 'wood' }, // Dining <-> Master
        { x: 6.0,  z: 0.5,  orient: 'V', width: 0.85, style: 'wood' }, // Living <-> Bath
        { x: 6.0,  z: 3.2,  orient: 'V', width: 0.95, style: 'wood' }, // Living <-> Bed 2
        { x: 3.0,  z: 5.5,  orient: 'H', width: 2.4, style: 'glass' }  // Living -> Balcony
      ],
      windows: [
        { x: -8.0, z: 5.5,  orient: 'H', width: 2.6, sill: 0.25, head: 2.9 },
        { x: 8.0,  z: 5.5,  orient: 'H', width: 2.6, sill: 0.25, head: 2.9 },
        { x: -10,  z: 2.8,  orient: 'V', width: 3.2, sill: 0.5,  head: 2.85 },
        { x: -10,  z: -5.0, orient: 'V', width: 3.0, sill: 0.5,  head: 2.85 },
        { x: -8.0, z: -7.5, orient: 'H', width: 2.4, sill: 0.65, head: 2.8 },
        { x: -4.0, z: -7.5, orient: 'H', width: 2.4, sill: 0.95, head: 2.8 },
        { x: 4.0,  z: -7.5, orient: 'H', width: 2.4, sill: 0.95, head: 2.8 },
        { x: 8.0,  z: -7.5, orient: 'H', width: 2.4, sill: 0.65, head: 2.8 },
        { x: 10,   z: -4.5, orient: 'V', width: 3.4, sill: 0.5,  head: 2.85 },
        { x: 10,   z: 3.5,  orient: 'V', width: 2.6, sill: 0.5,  head: 2.85 }
      ]
    },

    // =========================================================================
    // FLOOR 4: SIGNATURE 3BHK RESIDENCE + EXECUTIVE 1BHK (UNITS 401 & 402)
    // =========================================================================
    {
      level: 4,
      code: 'F4',
      name: 'Signature 3BHK + 1BHK',
      layoutType: 'Layout D · Asymmetric 3BHK & 1BHK',
      unitsSummary: 'Unit 401 (Signature 3BHK · 1,776 sf) · Unit 402 (Exec 1BHK · 1,130 sf)',
      accentColor: '#a78bfa',
      rooms: [
        { id: 'f4_core',    name: 'Lift & Stair Core',     unit: 'Core',     category: 'core',    x: -2,  z: -7.5, w: 4.0, d: 3.5 },
        { id: 'f4_lobby',   name: 'Floor 4 Lift Gallery',  unit: 'Common',   category: 'corridor',x: -2,  z: -4.0, w: 4.0, d: 4.0 },

        // Unit 401 (3BHK)
        { id: 'f4_401_din', name: '401 Gallery Dining',    unit: 'Unit 401', category: 'dining',  x: -6,  z: -4.0, w: 4.0, d: 4.0, furniturePreset: 'dining' },
        { id: 'f4_401_kit', name: '401 Chef Modular Kitchen', unit: 'Unit 401', category: 'kitchen', x: -6, z: -7.5, w: 4.0, d: 3.5, furniturePreset: 'modular_kitchen' },
        { id: 'f4_401_liv', name: '401 Grand Living Salon',unit: 'Unit 401', category: 'living',  x: -6,  z: 0.0,  w: 6.0, d: 5.5, furniturePreset: 'living_large' },
        { id: 'f4_401_bd3', name: '401 Bedroom 3 / Study', unit: 'Unit 401', category: 'study',   x: 0,   z: 0.0,  w: 4.0, d: 5.5, furniturePreset: 'bedroom' },
        { id: 'f4_401_bd2', name: '401 Guest Bedroom',     unit: 'Unit 401', category: 'bedroom', x: -10, z: -7.5, w: 4.0, d: 5.0, furniturePreset: 'bedroom' },
        { id: 'f4_401_bth', name: '401 Marble Bathroom',   unit: 'Unit 401', category: 'bath',    x: -10, z: -2.5, w: 4.0, d: 2.5, furniturePreset: 'bathroom' },
        { id: 'f4_401_mst', name: '401 Master Suite',      unit: 'Unit 401', category: 'bedroom', x: -10, z: 0.0,  w: 4.0, d: 5.5, furniturePreset: 'bedroom_master' },
        { id: 'f4_401_bal', name: '401 Panoramic Terrace', unit: 'Unit 401', category: 'balcony', x: -10, z: 5.5,  w: 14,  d: 2.0, isBalcony: true, furniturePreset: 'balcony' },

        // Unit 402 (1BHK Executive)
        { id: 'f4_402_liv', name: '402 Living & Dining',   unit: 'Unit 402', category: 'living',  x: 2.0, z: -4.0, w: 4.5, d: 4.0, furniturePreset: 'living_dining' },
        { id: 'f4_402_kit', name: '402 Modular Kitchen',   unit: 'Unit 402', category: 'kitchen', x: 2.0, z: -7.5, w: 4.5, d: 3.5, furniturePreset: 'modular_kitchen' },
        { id: 'f4_402_bth', name: '402 Bathroom',          unit: 'Unit 402', category: 'bath',    x: 6.5, z: -7.5, w: 3.5, d: 3.5, furniturePreset: 'bathroom' },
        { id: 'f4_402_std', name: '402 Dressing & Study',  unit: 'Unit 402', category: 'study',   x: 6.5, z: -4.0, w: 3.5, d: 4.0, furniturePreset: 'coworking' },
        { id: 'f4_402_mst', name: '402 Master Suite',      unit: 'Unit 402', category: 'bedroom', x: 4.0, z: 0.0,  w: 6.0, d: 5.5, furniturePreset: 'bedroom_master' },
        { id: 'f4_402_bal', name: '402 East Balcony',      unit: 'Unit 402', category: 'balcony', x: 4.0, z: 5.5,  w: 6.0, d: 2.0, isBalcony: true, furniturePreset: 'balcony_compact' }
      ],
      doors: [
        { x: -1.0, z: -4.0, orient: 'H', width: 1.0, style: 'elevator' },
        { x: 1.0,  z: -4.0, orient: 'H', width: 1.0, style: 'elevator' },
        { x: -2.0, z: -2.0, orient: 'V', width: 1.05, style: 'wood' }, // Enter 401
        { x: 2.0,  z: -2.0, orient: 'V', width: 1.05, style: 'wood' }, // Enter 402
        // 401
        { x: -4.0, z: -4.0, orient: 'H', width: 1.5, style: 'open' },
        { x: -4.0, z: 0.0,  orient: 'H', width: 2.2, style: 'open' },
        { x: 0.0,  z: 2.5,  orient: 'V', width: 0.95, style: 'wood' }, // Living <-> Bed 3
        { x: -6.0, z: -3.2, orient: 'V', width: 0.95, style: 'wood' }, // Dining <-> Bed 2
        { x: -6.0, z: -1.2, orient: 'V', width: 0.85, style: 'wood' }, // Dining <-> Bath
        { x: -6.0, z: 2.5,  orient: 'V', width: 0.95, style: 'wood' }, // Living <-> Master
        { x: -3.0, z: 5.5,  orient: 'H', width: 2.6, style: 'glass' },
        // 402
        { x: 4.2,  z: -4.0, orient: 'H', width: 1.5, style: 'open' },  // 402 Living <-> Kitchen
        { x: 6.5,  z: -2.0, orient: 'V', width: 1.1, style: 'open' },  // 402 Living <-> Study
        { x: 8.2,  z: -4.0, orient: 'H', width: 0.85, style: 'wood' }, // 402 Study <-> Bath
        { x: 5.2,  z: 0.0,  orient: 'H', width: 1.0, style: 'wood' },  // 402 Living <-> Master
        { x: 7.0,  z: 5.5,  orient: 'H', width: 2.2, style: 'glass' }
      ],
      windows: [
        { x: -8.0, z: 5.5,  orient: 'H', width: 2.6, sill: 0.2,  head: 2.95 },
        { x: 2.0,  z: 5.5,  orient: 'H', width: 2.4, sill: 0.2,  head: 2.95 },
        { x: -10,  z: 2.8,  orient: 'V', width: 3.4, sill: 0.35, head: 2.9 },
        { x: -10,  z: -5.0, orient: 'V', width: 3.2, sill: 0.35, head: 2.9 },
        { x: -4.0, z: -7.5, orient: 'H', width: 2.4, sill: 0.95, head: 2.8 },
        { x: 4.2,  z: -7.5, orient: 'H', width: 2.4, sill: 0.95, head: 2.8 },
        { x: 10,   z: -2.0, orient: 'V', width: 2.6, sill: 0.45, head: 2.9 },
        { x: 10,   z: 2.8,  orient: 'V', width: 3.4, sill: 0.25, head: 2.95 }
      ]
    },

    // =========================================================================
    // FLOOR 5: FULL-FLOOR 4BHK SKY VILLA (UNIT 501)
    // =========================================================================
    {
      level: 5,
      code: 'F5',
      name: 'Full-Floor 4BHK Sky Villa',
      layoutType: 'Layout E · Private Full-Plate Residence',
      unitsSummary: 'Sky Villa 501 (Full-Floor 4BHK · 3,229 sf · Private Lift)',
      accentColor: '#f472b6',
      rooms: [
        { id: 'f5_core',    name: 'Lift & Stair Core',        unit: 'Core',      category: 'core',    x: -2,  z: -7.5, w: 4, d: 3.5 },
        { id: 'f5_foyer',   name: '501 Private Lift Gallery', unit: 'Villa 501', category: 'corridor',x: -2,  z: -4.0, w: 4, d: 3.0 },
        { id: 'f5_salon',   name: '501 Grand Sky Salon',      unit: 'Villa 501', category: 'living',  x: -5,  z: -1.0, w: 10,d: 6.0, furniturePreset: 'sky_salon' },
        { id: 'f5_kitchen', name: '501 Chef Island Kitchen',  unit: 'Villa 501', category: 'kitchen', x: 2,   z: -7.5, w: 5, d: 6.5, furniturePreset: 'modular_kitchen_large' },
        { id: 'f5_dining',  name: '501 Formal Dining Room',   unit: 'Villa 501', category: 'dining',  x: -6,  z: -7.5, w: 4, d: 6.5, furniturePreset: 'dining_grand' },
        { id: 'f5_master',  name: '501 Master Sky Suite',     unit: 'Villa 501', category: 'bedroom', x: -10, z: -1.0, w: 5, d: 6.0, furniturePreset: 'bedroom_master' },
        { id: 'f5_mbath',   name: '501 Master Spa & Closet',  unit: 'Villa 501', category: 'bath',    x: -10, z: -7.5, w: 4, d: 6.5, furniturePreset: 'bathroom_spa' },
        { id: 'f5_bed2',    name: '501 North-East Suite',     unit: 'Villa 501', category: 'bedroom', x: 7,   z: -7.5, w: 3, d: 6.5, furniturePreset: 'bedroom' },
        { id: 'f5_ebath',   name: '501 East Guest Bath',      unit: 'Villa 501', category: 'bath',    x: 5,   z: -1.0, w: 5, d: 2.5, furniturePreset: 'bathroom' },
        { id: 'f5_bed3',    name: '501 South-East Bedroom',   unit: 'Villa 501', category: 'bedroom', x: 5,   z: 1.5,  w: 5, d: 3.5, furniturePreset: 'bedroom' },
        { id: 'f5_terrace', name: '501 Full-Width Sky Deck',  unit: 'Villa 501', category: 'balcony', x: -10, z: 5.0,  w: 20,d: 2.5, isBalcony: true, furniturePreset: 'sky_terrace' }
      ],
      doors: [
        { x: -1.0, z: -4.0, orient: 'H', width: 1.0, style: 'elevator' },
        { x: 1.0,  z: -4.0, orient: 'H', width: 1.0, style: 'elevator' },
        { x: 0.0,  z: -1.0, orient: 'H', width: 2.4, style: 'open' },  // Gallery -> Grand Salon
        { x: -2.0, z: -2.5, orient: 'V', width: 1.5, style: 'open' },  // Gallery <-> Dining
        { x: 2.0,  z: -2.5, orient: 'V', width: 1.5, style: 'open' },  // Gallery <-> Kitchen
        { x: -3.5, z: -1.0, orient: 'H', width: 1.8, style: 'open' },  // Dining <-> Salon
        { x: 3.5,  z: -1.0, orient: 'H', width: 1.8, style: 'open' },  // Kitchen <-> Salon
        { x: -5.0, z: 2.0,  orient: 'V', width: 1.1, style: 'wood' },  // Salon <-> Master Suite
        { x: -8.0, z: -1.0, orient: 'H', width: 1.0, style: 'wood' },  // Master <-> Master Spa
        { x: 7.0,  z: -2.5, orient: 'V', width: 0.95, style: 'wood' }, // Kitchen <-> NE Suite
        { x: 5.0,  z: 0.2,  orient: 'V', width: 0.85, style: 'wood' }, // Salon <-> East Bath
        { x: 5.0,  z: 3.2,  orient: 'V', width: 0.95, style: 'wood' }, // Salon <-> SE Bed
        { x: 0.0,  z: 5.0,  orient: 'H', width: 3.6, style: 'glass_double' },
        { x: -7.5, z: 5.0,  orient: 'H', width: 2.2, style: 'glass' }
      ],
      windows: [
        { x: -3.5, z: 5.0,  orient: 'H', width: 2.4, sill: 0.15, head: 3.0 },
        { x: 3.5,  z: 5.0,  orient: 'H', width: 2.4, sill: 0.15, head: 3.0 },
        { x: 7.5,  z: 5.0,  orient: 'H', width: 3.0, sill: 0.2,  head: 2.95 },
        { x: -10,  z: 2.0,  orient: 'V', width: 4.2, sill: 0.2,  head: 2.95 },
        { x: -10,  z: -4.2, orient: 'V', width: 3.4, sill: 0.8,  head: 2.85 },
        { x: -4.0, z: -7.5, orient: 'H', width: 2.8, sill: 0.35, head: 2.9 },
        { x: 4.5,  z: -7.5, orient: 'H', width: 3.2, sill: 0.95, head: 2.85 },
        { x: 10,   z: -4.2, orient: 'V', width: 4.0, sill: 0.35, head: 2.9 },
        { x: 10,   z: 3.2,  orient: 'V', width: 2.6, sill: 0.35, head: 2.9 }
      ]
    },

    // =========================================================================
    // FLOOR 6: CROWN PENTHOUSE PAVILION & ROOFTOP SKY TERRACE
    // =========================================================================
    {
      level: 6,
      code: 'F6',
      name: 'Crown Penthouse & Sky Deck',
      layoutType: 'Layout F · Glass Pavilion + Wrap-Around Rooftop',
      unitsSummary: 'Penthouse PH1 · Plunge Pool Deck · Sunset Pergola Lounge',
      accentColor: '#fbbf24',
      isPenthouse: true,
      rooms: [
        { id: 'f6_core',    name: 'Lift & Stair Core',        unit: 'Core',      category: 'core',    x: -2.0, z: -7.5, w: 4.0, d: 3.5 },
        { id: 'f6_foyer',   name: 'Penthouse Gallery',        unit: 'Penthouse', category: 'corridor',x: -2.0, z: -4.0, w: 4.0, d: 2.5 },
        { id: 'f6_salon',   name: 'Glass Pavilion Salon',     unit: 'Penthouse', category: 'living',  x: -6.5, z: -1.5, w: 8.5, d: 5.0, furniturePreset: 'sky_salon' },
        { id: 'f6_kitchen', name: 'Gourmet Sky Kitchen & Bar',unit: 'Penthouse', category: 'kitchen', x: 2.0,  z: -4.0, w: 4.5, d: 7.5, furniturePreset: 'modular_kitchen_large' },
        { id: 'f6_master',  name: 'Penthouse Master Suite',   unit: 'Penthouse', category: 'bedroom', x: -6.5, z: -7.5, w: 4.5, d: 6.0, furniturePreset: 'bedroom_master' },
        { id: 'f6_bath',    name: 'Skylight Spa Bath',        unit: 'Penthouse', category: 'bath',    x: 2.0,  z: -7.5, w: 4.5, d: 3.5, furniturePreset: 'bathroom_spa' },
        // Wrap-around Open Sky Decks
        { id: 'f6_wdeck',   name: 'West Pergola Lounge Deck', unit: 'Sky Deck',  category: 'balcony', x: -10,  z: -7.5, w: 3.5, d: 11.0, isBalcony: true, furniturePreset: 'rooftop_lounge' },
        { id: 'f6_edeck',   name: 'East Plunge Pool Deck',    unit: 'Sky Deck',  category: 'balcony', x: 6.5,  z: -7.5, w: 3.5, d: 11.0, isBalcony: true, furniturePreset: 'plunge_pool' },
        { id: 'f6_sdeck',   name: 'South Panorama Sky Deck',  unit: 'Sky Deck',  category: 'balcony', x: -10,  z: 3.5,  w: 20.0,d: 4.0,  isBalcony: true, furniturePreset: 'sky_terrace_grand' }
      ],
      doors: [
        { x: -1.0, z: -4.0, orient: 'H', width: 1.0, style: 'elevator' },
        { x: 1.0,  z: -4.0, orient: 'H', width: 1.0, style: 'elevator' },
        { x: 0.0,  z: -1.5, orient: 'H', width: 2.4, style: 'open' },  // Foyer -> Pavilion Salon
        { x: 2.0,  z: -2.8, orient: 'V', width: 1.6, style: 'open' },  // Foyer -> Sky Kitchen
        { x: 2.0,  z: 1.0,  orient: 'V', width: 2.2, style: 'open' },  // Salon <-> Sky Kitchen
        { x: -4.2, z: -1.5, orient: 'H', width: 1.1, style: 'wood' },  // Salon <-> Master
        { x: 4.2,  z: -4.0, orient: 'H', width: 0.95, style: 'wood' }, // Kitchen <-> Spa Bath
        // Exterior Glass Doors onto Rooftop Sky Decks
        { x: -2.2, z: 3.5,  orient: 'H', width: 3.2, style: 'glass_double' },
        { x: 4.2,  z: 3.5,  orient: 'H', width: 2.2, style: 'glass' },
        { x: -6.5, z: 1.0,  orient: 'V', width: 2.4, style: 'glass' },
        { x: 6.5,  z: 0.0,  orient: 'V', width: 2.4, style: 'glass' }
      ],
      windows: [
        { x: -5.0, z: 3.5,  orient: 'H', width: 2.0, sill: 0.15, head: 3.0 },
        { x: 0.8,  z: 3.5,  orient: 'H', width: 2.0, sill: 0.15, head: 3.0 },
        { x: -6.5, z: -4.5, orient: 'V', width: 3.8, sill: 0.2,  head: 2.95 },
        { x: -4.2, z: -7.5, orient: 'H', width: 3.0, sill: 0.3,  head: 2.9 },
        { x: 4.2,  z: -7.5, orient: 'H', width: 2.6, sill: 0.9,  head: 2.85 },
        { x: 6.5,  z: -2.5, orient: 'V', width: 2.2, sill: 0.2,  head: 2.95 }
      ]
    }
  ]
};

#!/usr/bin/env tsx

/**
 * Task 10 Validation Script
 * Validates Mapbox Integration & Base Map Setup
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  test: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: ValidationResult[] = [];

function validateFile(filePath: string, description: string): boolean {
  const fullPath = path.join(process.cwd(), filePath);
  const exists = fs.existsSync(fullPath);

  const result: ValidationResult = {
    test: `File exists: ${description}`,
    passed: exists,
  };

  if (!exists) {
    result.error = `File not found: ${filePath}`;
  }

  results.push(result);
  return exists;
}

function validateFileContains(
  filePath: string,
  searchStrings: string[],
  description: string
): boolean {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    results.push({
      test: description,
      passed: false,
      error: `File not found: ${filePath}`,
    });
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const missingStrings = searchStrings.filter((str) => !content.includes(str));

  const passed = missingStrings.length === 0;
  const result: ValidationResult = {
    test: description,
    passed,
  };

  if (!passed) {
    result.error = `Missing: ${missingStrings.join(', ')}`;
    result.details = { missing: missingStrings };
  }

  results.push(result);
  return passed;
}

function validateEnvironmentVariable(varName: string): boolean {
  const value = process.env[varName];
  const exists = !!value;

  const result: ValidationResult = {
    test: `Environment variable: ${varName}`,
    passed: exists,
  };

  if (!exists) {
    result.error = `${varName} not set in environment`;
  }

  results.push(result);
  return exists;
}

async function runValidation() {
  console.log('🔍 Task 10: MapLibre Integration & Base Map Setup Validation\n');

  // 1. Validate map configuration file
  console.log('📋 Validating map configuration...');
  validateFile('src/lib/map-config.ts', 'Map configuration');
  validateFileContains(
    'src/lib/map-config.ts',
    [
      'center: [0, 20]',
      'zoom: 2',
      'minZoom: 1',
      'maxZoom: 12',
      'createMapOptions',
      'OSM_DARK_STYLE',
    ],
    'Map config contains required settings'
  );

  // 2. Validate map utilities
  console.log('📋 Validating map utilities...');
  validateFile('src/lib/map-utils.ts', 'Map utilities');
  validateFileContains(
    'src/lib/map-utils.ts',
    [
      'fitMapToBounds',
      'flyToLocation',
      'getMapBounds',
      'isLocationInView',
      'convertToMapboxCoordinates',
      'h3ToPolygon',
    ],
    'Map utilities contain required functions'
  );

  // 3. Validate map context
  console.log('📋 Validating map context...');
  validateFile('src/contexts/MapContext.tsx', 'Map context');
  validateFileContains(
    'src/contexts/MapContext.tsx',
    [
      "'use client'",
      'MapProvider',
      'useMapContext',
      'map: Map | null',
      'isLoaded: boolean',
      'error: Error | null',
    ],
    'Map context provides required functionality'
  );

  // 4. Validate map hooks
  console.log('📋 Validating map hooks...');
  validateFile('src/hooks/useMap.ts', 'Map hooks');
  validateFileContains(
    'src/hooks/useMap.ts',
    ['useMap', 'useMapEvent', 'useMapLayer', 'useMapZoom', 'useMapMove', 'useMapCursor'],
    'Map hooks provide required functionality'
  );

  // 5. Validate MapContainer component
  console.log('📋 Validating MapContainer component...');
  validateFile('src/components/Map/MapContainer.tsx', 'MapContainer component');
  validateFileContains(
    'src/components/Map/MapContainer.tsx',
    [
      "'use client'",
      'MapContainer',
      'MapLoadingSkeleton',
      'MapError',
      'MapOverlay',
      'MapProvider',
    ],
    'MapContainer provides required components'
  );

  // 6. Validate MapboxMap component
  console.log('📋 Validating MapboxMap component...');
  validateFile('src/components/Map/MapboxMap.tsx', 'MapboxMap component');
  validateFileContains(
    'src/components/Map/MapboxMap.tsx',
    [
      "'use client'",
      'maplibregl',
      'maplibre-gl/dist/maplibre-gl.css',
      'NavigationControl',
      'ScaleControl',
      'createMapOptions',
      "map.on('load'",
      "map.on('error'",
    ],
    'MapboxMap initializes map correctly'
  );

  // 7. Validate exports
  console.log('📋 Validating component exports...');
  validateFile('src/components/Map/index.ts', 'Map components index');

  // 8. Validate environment configuration
  console.log('📋 Validating environment configuration...');
  validateFileContains(
    '.env.example',
    ['NEXT_PUBLIC_MAPTILER_KEY'],
    'Environment example contains map configuration'
  );

  // 9. Check for MapLibre GL JS installation
  console.log('📋 Validating dependencies...');
  validateFile('package.json', 'package.json');
  validateFileContains(
    'package.json',
    ['"maplibre-gl":'],
    'MapLibre GL JS installed'
  );

  // 10. Performance optimizations check
  console.log('📋 Validating performance optimizations...');
  validateFileContains(
    'src/lib/map-config.ts',
    ['refreshExpiredTiles', 'fadeDuration'],
    'Performance optimizations configured'
  );

  // Print results
  console.log('\n' + '='.repeat(70));
  console.log('VALIDATION RESULTS');
  console.log('='.repeat(70) + '\n');

  const passedTests = results.filter((r) => r.passed).length;
  const totalTests = results.length;

  results.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${index + 1}. ${result.test}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
  });

  console.log('\n' + '='.repeat(70));
  console.log(`SUMMARY: ${passedTests}/${totalTests} tests passed`);
  console.log('='.repeat(70) + '\n');

  if (passedTests === totalTests) {
    console.log('🎉 All validation checks passed!');
    console.log('\n📝 Next steps:');
    console.log('   1. [OPTIONAL] Add Maptiler API key to .env.local for better styling');
    console.log('      NEXT_PUBLIC_MAPTILER_KEY=your-key (free tier: 100k tiles/month)');
    console.log('   2. Add MapContainer to your page:');
    console.log('      import { MapContainer } from "@/components/Map";');
    console.log('      <MapContainer className="h-screen" />');
    console.log('   3. Run the development server: pnpm dev');
    console.log('   4. View demo: http://localhost:3000/map-demo');
    console.log('   5. Map works out of the box with free OpenStreetMap tiles!\n');
    process.exit(0);
  } else {
    console.log('❌ Some validation checks failed. Please review the errors above.\n');
    process.exit(1);
  }
}

runValidation().catch((error) => {
  console.error('Validation script error:', error);
  process.exit(1);
});

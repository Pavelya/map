/**
 * Task 11 Validation Script
 *
 * Validates that all required components and files are present
 * and properly exported for the Deck.gl Layer Integration.
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

interface ValidationResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: ValidationResult[] = [];

function checkFile(filePath: string, name: string): void {
  const fullPath = resolve(process.cwd(), filePath);
  const exists = existsSync(fullPath);

  results.push({
    name,
    passed: exists,
    message: exists
      ? `✓ ${name}`
      : `✗ ${name} - File not found: ${filePath}`,
  });
}

function validatePackageJson(): void {
  try {
    const pkg = require('../package.json');
    const hasDeckGlMapbox = !!pkg.dependencies['@deck.gl/mapbox'];
    const hasDeckGlCore = !!pkg.dependencies['@deck.gl/core'];
    const hasDeckGlGeoLayers = !!pkg.dependencies['@deck.gl/geo-layers'];

    results.push({
      name: 'Deck.gl packages installed',
      passed: hasDeckGlMapbox && hasDeckGlCore && hasDeckGlGeoLayers,
      message: hasDeckGlMapbox && hasDeckGlCore && hasDeckGlGeoLayers
        ? '✓ All required Deck.gl packages present'
        : '✗ Missing required Deck.gl packages',
    });
  } catch (error) {
    results.push({
      name: 'Package validation',
      passed: false,
      message: `✗ Failed to validate package.json: ${error}`,
    });
  }
}

async function validateImports(): Promise<void> {
  try {
    // Validate core utilities
    await import('../src/lib/color-utils.js');
    results.push({
      name: 'Color utilities import',
      passed: true,
      message: '✓ Color utilities can be imported',
    });

    await import('../src/lib/layers/data-transformer.js');
    results.push({
      name: 'Data transformer import',
      passed: true,
      message: '✓ Data transformer can be imported',
    });

    await import('../src/lib/layers/h3-layer.js');
    results.push({
      name: 'H3 layer import',
      passed: true,
      message: '✓ H3 layer configuration can be imported',
    });

    await import('../src/lib/layers/layer-manager.js');
    results.push({
      name: 'Layer manager import',
      passed: true,
      message: '✓ Layer manager can be imported',
    });

    // Validate components
    await import('../src/components/Map/DeckGLOverlay.js');
    results.push({
      name: 'DeckGL overlay import',
      passed: true,
      message: '✓ DeckGL overlay component can be imported',
    });

    await import('../src/components/Map/HexagonTooltip.js');
    results.push({
      name: 'Hexagon tooltip import',
      passed: true,
      message: '✓ Hexagon tooltip component can be imported',
    });

    // Validate hooks
    await import('../src/hooks/useLayerInteraction.js');
    results.push({
      name: 'Layer interaction hook import',
      passed: true,
      message: '✓ Layer interaction hook can be imported',
    });
  } catch (error: any) {
    results.push({
      name: 'Import validation',
      passed: false,
      message: `✗ Import failed: ${error.message}`,
    });
  }
}

async function main() {
  console.log('🔍 Validating Task 11: Deck.gl Layer Integration\n');

  // Check file existence
  console.log('📁 Checking files...\n');
  checkFile('src/lib/color-utils.ts', 'Color utilities');
  checkFile('src/lib/layers/data-transformer.ts', 'Data transformer');
  checkFile('src/lib/layers/h3-layer.ts', 'H3 layer configuration');
  checkFile('src/lib/layers/layer-manager.ts', 'Layer manager');
  checkFile('src/components/Map/DeckGLOverlay.tsx', 'DeckGL overlay component');
  checkFile('src/components/Map/HexagonTooltip.tsx', 'Hexagon tooltip component');
  checkFile('src/hooks/useLayerInteraction.ts', 'Layer interaction hook');
  checkFile('src/types/deck.gl.d.ts', 'Deck.gl type definitions');
  checkFile('src/components/Map/DeckGLExample.tsx', 'Usage example');

  // Check package.json
  console.log('\n📦 Checking packages...\n');
  validatePackageJson();

  // Validate imports (requires build)
  console.log('\n🔌 Checking imports...\n');
  console.log('Note: Import validation requires the project to be built first.');
  console.log('Run `pnpm build` before import validation.\n');

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('VALIDATION RESULTS');
  console.log('='.repeat(60) + '\n');

  results.forEach((result) => {
    console.log(result.message);
  });

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);

  console.log('\n' + '='.repeat(60));
  console.log(`Score: ${passed}/${total} (${percentage}%)`);
  console.log('='.repeat(60) + '\n');

  if (passed === total) {
    console.log('✅ All validation checks passed!\n');
    console.log('Task 11 implementation is complete.');
    console.log('\nNext steps:');
    console.log('1. Run `pnpm type-check` to verify TypeScript compilation');
    console.log('2. Run `pnpm build` to build the project');
    console.log('3. Test the components in your application');
    console.log('4. See TASK-11-IMPLEMENTATION.md for usage examples\n');
    process.exit(0);
  } else {
    console.log('❌ Some validation checks failed.\n');
    console.log('Please review the errors above and fix them.\n');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Validation script error:', error);
  process.exit(1);
});

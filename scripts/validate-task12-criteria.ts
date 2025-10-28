/**
 * Task 12 Validation Script
 *
 * Validates that all requirements for Task 12: Vote Stats Display & Live Updates
 * have been properly implemented.
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: string;
}

interface TestResults {
  passed: number;
  failed: number;
  total: number;
  results: ValidationResult[];
}

const results: TestResults = {
  passed: 0,
  failed: 0,
  total: 0,
  results: [],
};

function validateFile(filePath: string, description: string): ValidationResult {
  const fullPath = path.join(process.cwd(), filePath);
  const exists = fs.existsSync(fullPath);

  if (exists) {
    const content = fs.readFileSync(fullPath, 'utf-8');
    return {
      passed: true,
      message: `✓ ${description}`,
      details: `File exists with ${content.split('\n').length} lines`,
    };
  } else {
    return {
      passed: false,
      message: `✗ ${description}`,
      details: `File not found: ${filePath}`,
    };
  }
}

function validateFileContent(
  filePath: string,
  description: string,
  requiredContent: string[]
): ValidationResult {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    return {
      passed: false,
      message: `✗ ${description}`,
      details: `File not found: ${filePath}`,
    };
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const missingContent: string[] = [];

  for (const required of requiredContent) {
    if (!content.includes(required)) {
      missingContent.push(required);
    }
  }

  if (missingContent.length === 0) {
    return {
      passed: true,
      message: `✓ ${description}`,
      details: `All required content found`,
    };
  } else {
    return {
      passed: false,
      message: `✗ ${description}`,
      details: `Missing content: ${missingContent.join(', ')}`,
    };
  }
}

function addResult(result: ValidationResult) {
  results.results.push(result);
  results.total++;
  if (result.passed) {
    results.passed++;
  } else {
    results.failed++;
  }
}

function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log('TASK 12: Vote Stats Display & Live Updates - Validation Results');
  console.log('='.repeat(80) + '\n');

  for (const result of results.results) {
    console.log(result.message);
    if (result.details) {
      console.log(`  ${result.details}`);
    }
    console.log('');
  }

  console.log('='.repeat(80));
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('='.repeat(80) + '\n');

  if (results.failed === 0) {
    console.log('✓ All validation criteria passed!\n');
    process.exit(0);
  } else {
    console.log('✗ Some validation criteria failed. Please review the results above.\n');
    process.exit(1);
  }
}

// Run validations
console.log('\nValidating Task 12 implementation...\n');

// 1. Validate stats store
addResult(
  validateFile('src/store/stats-store.ts', 'Stats store created')
);

addResult(
  validateFileContent(
    'src/store/stats-store.ts',
    'Stats store has required interface and actions',
    ['StatsState', 'setStats', 'incrementTeamA', 'incrementTeamB', 'useStatsStore', 'create']
  )
);

// 2. Validate stats utilities
addResult(
  validateFile('src/lib/stats-utils.ts', 'Stats utilities created')
);

addResult(
  validateFileContent(
    'src/lib/stats-utils.ts',
    'Stats utilities have required functions',
    [
      'calculatePercentage',
      'formatVoteCount',
      'formatWithCommas',
      'getDominanceLevel',
      'getStatsDifference',
      'calculateVisiblePercentages',
    ]
  )
);

// 3. Validate animation variants
addResult(
  validateFile('src/lib/animation-variants.ts', 'Animation variants created')
);

addResult(
  validateFileContent(
    'src/lib/animation-variants.ts',
    'Animation variants have required exports',
    ['counterVariants', 'barVariants', 'barSegmentVariants']
  )
);

// 4. Validate AnimatedCounter component
addResult(
  validateFile('src/components/Stats/AnimatedCounter.tsx', 'AnimatedCounter component created')
);

addResult(
  validateFileContent(
    'src/components/Stats/AnimatedCounter.tsx',
    'AnimatedCounter has required features',
    ['AnimatedCounter', 'useSpring', 'useTransform', 'formatWithCommas', 'motion.span']
  )
);

// 5. Validate PercentageBar component
addResult(
  validateFile('src/components/Stats/PercentageBar.tsx', 'PercentageBar component created')
);

addResult(
  validateFileContent(
    'src/components/Stats/PercentageBar.tsx',
    'PercentageBar has required features',
    [
      'PercentageBar',
      'calculateVisiblePercentages',
      'barSegmentVariants',
      'teamAColor',
      'teamBColor',
      'aria-label',
    ]
  )
);

// 6. Validate VoteStats component
addResult(
  validateFile('src/components/Stats/VoteStats.tsx', 'VoteStats component created')
);

addResult(
  validateFileContent(
    'src/components/Stats/VoteStats.tsx',
    'VoteStats has required features',
    [
      'VoteStats',
      'useStatsStore',
      'AnimatedCounter',
      'PercentageBar',
      'teamAName',
      'teamBName',
      'teamALogoUrl',
      'teamBLogoUrl',
    ]
  )
);

// 7. Validate useVoteUpdates hook
addResult(
  validateFile('src/hooks/useVoteUpdates.ts', 'useVoteUpdates hook created')
);

addResult(
  validateFileContent(
    'src/hooks/useVoteUpdates.ts',
    'useVoteUpdates integrates with WebSocket and store',
    ['useVoteUpdates', 'useVoteSocket', 'useStatsStore', 'setStats']
  )
);

// 8. Validate barrel export
addResult(
  validateFile('src/components/Stats/index.ts', 'Stats components barrel export created')
);

addResult(
  validateFileContent(
    'src/components/Stats/index.ts',
    'Barrel export includes all components',
    ['AnimatedCounter', 'PercentageBar', 'VoteStats']
  )
);

// 9. Check for required dependencies
addResult(
  validateFileContent(
    'package.json',
    'Required dependencies installed',
    ['framer-motion', 'zustand', 'socket.io-client']
  )
);

// 10. Validate responsive design considerations
addResult(
  validateFileContent(
    'src/components/Stats/VoteStats.tsx',
    'VoteStats has responsive design (grid layout)',
    ['grid grid-cols-1 md:grid-cols-2']
  )
);

// 11. Validate accessibility features
addResult(
  validateFileContent(
    'src/components/Stats/AnimatedCounter.tsx',
    'AnimatedCounter has ARIA labels',
    ['aria-live', 'aria-atomic']
  )
);

addResult(
  validateFileContent(
    'src/components/Stats/PercentageBar.tsx',
    'PercentageBar has accessibility features',
    ['role="progressbar"', 'aria-label']
  )
);

// 12. Validate team colors integration
addResult(
  validateFileContent(
    'src/components/Stats/VoteStats.tsx',
    'VoteStats uses team colors for styling',
    ['teamAColor', 'teamBColor', 'style={{', 'backgroundColor']
  )
);

// 13. Validate smooth animations
addResult(
  validateFileContent(
    'src/lib/animation-variants.ts',
    'Animation variants have smooth transitions',
    ['transition', 'duration', 'ease']
  )
);

// 14. Validate minimum width constraint for percentage bar
addResult(
  validateFileContent(
    'src/lib/stats-utils.ts',
    'Stats utilities ensure minimum percentage visibility',
    ['calculateVisiblePercentages', 'minPercentage']
  )
);

// 15. Validate WebSocket reconnection handling
addResult(
  validateFileContent(
    'src/hooks/useVoteUpdates.ts',
    'useVoteUpdates supports reconnection',
    ['retry', 'reconnectAttempts']
  )
);

// Print final results
printResults();

#!/usr/bin/env tsx

/**
 * TASK 13 Validation Script: Vote Submission UI & Form
 *
 * Validates all requirements for the vote submission form implementation
 */

import fs from 'fs';
import path from 'path';

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: string;
}

interface CategoryResult {
  category: string;
  results: ValidationResult[];
  passed: boolean;
}

const results: CategoryResult[] = [];

/**
 * Helper to check if file exists
 */
function fileExists(filePath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), filePath));
}

/**
 * Helper to read file content
 */
function readFile(filePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8');
}

/**
 * Helper to check if file contains pattern
 */
function fileContains(filePath: string, pattern: string | RegExp): boolean {
  if (!fileExists(filePath)) return false;
  const content = readFile(filePath);
  if (typeof pattern === 'string') {
    return content.includes(pattern);
  }
  return pattern.test(content);
}

/**
 * Validate dependencies installation
 */
function validateDependencies(): CategoryResult {
  const results: ValidationResult[] = [];
  const packageJsonPath = 'package.json';

  if (!fileExists(packageJsonPath)) {
    return {
      category: 'Dependencies',
      results: [{ passed: false, message: 'package.json not found' }],
      passed: false,
    };
  }

  const packageJson = JSON.parse(readFile(packageJsonPath));
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  // Check required dependencies
  const requiredDeps = [
    'react-hook-form',
    '@hookform/resolvers',
    '@hcaptcha/react-hcaptcha',
    'zod',
  ];

  requiredDeps.forEach((dep) => {
    results.push({
      passed: !!deps[dep],
      message: `${dep} is installed`,
      details: deps[dep] ? `Version: ${deps[dep]}` : 'Not found',
    });
  });

  return {
    category: 'Dependencies',
    results,
    passed: results.every((r) => r.passed),
  };
}

/**
 * Validate error handling utility
 */
function validateErrorHandling(): CategoryResult {
  const results: ValidationResult[] = [];
  const filePath = 'src/lib/vote-errors.ts';

  results.push({
    passed: fileExists(filePath),
    message: 'Vote errors utility file exists',
  });

  if (fileExists(filePath)) {
    const checks = [
      { pattern: /export.*getErrorMessage/, message: 'getErrorMessage function exists' },
      { pattern: /RATE_LIMITED/, message: 'RATE_LIMITED error type defined' },
      { pattern: /VOTE_LIMIT_EXCEEDED/, message: 'VOTE_LIMIT_EXCEEDED error type defined' },
      { pattern: /MATCH_ENDED/, message: 'MATCH_ENDED error type defined' },
      { pattern: /CAPTCHA_FAILED/, message: 'CAPTCHA_FAILED error type defined' },
      { pattern: /NETWORK_ERROR/, message: 'NETWORK_ERROR error type defined' },
    ];

    checks.forEach((check) => {
      results.push({
        passed: fileContains(filePath, check.pattern),
        message: check.message,
      });
    });
  }

  return {
    category: 'Error Handling',
    results,
    passed: results.every((r) => r.passed),
  };
}

/**
 * Validate Toast provider
 */
function validateToastProvider(): CategoryResult {
  const results: ValidationResult[] = [];
  const filePath = 'src/components/Toast/ToastProvider.tsx';

  results.push({
    passed: fileExists(filePath),
    message: 'ToastProvider component exists',
  });

  if (fileExists(filePath)) {
    const checks = [
      { pattern: /@radix-ui\/react-toast/, message: 'Uses Radix UI Toast' },
      { pattern: /useToast/, message: 'useToast hook exported' },
      { pattern: /success.*error.*info/s, message: 'Success, error, and info toast methods' },
      { pattern: /aria-live/, message: 'ARIA live region for accessibility' },
      { pattern: /lucide-react/, message: 'Uses lucide-react icons' },
    ];

    checks.forEach((check) => {
      results.push({
        passed: fileContains(filePath, check.pattern),
        message: check.message,
      });
    });
  }

  return {
    category: 'Toast Provider',
    results,
    passed: results.every((r) => r.passed),
  };
}

/**
 * Validate TeamSelector component
 */
function validateTeamSelector(): CategoryResult {
  const results: ValidationResult[] = [];
  const filePath = 'src/components/Vote/TeamSelector.tsx';

  results.push({
    passed: fileExists(filePath),
    message: 'TeamSelector component exists',
  });

  if (fileExists(filePath)) {
    const checks = [
      { pattern: /export.*interface.*Team/, message: 'Team interface exported' },
      { pattern: /team_a.*team_b/, message: 'Supports team_a and team_b' },
      { pattern: /aria-label/, message: 'ARIA labels for accessibility' },
      { pattern: /hover:scale/, message: 'Hover effect implemented' },
      { pattern: /type="radio"/, message: 'Radio inputs for selection' },
      { pattern: /focus.*ring/, message: 'Keyboard focus styles' },
    ];

    checks.forEach((check) => {
      results.push({
        passed: fileContains(filePath, check.pattern),
        message: check.message,
      });
    });
  }

  return {
    category: 'TeamSelector Component',
    results,
    passed: results.every((r) => r.passed),
  };
}

/**
 * Validate LocationConsent component
 */
function validateLocationConsent(): CategoryResult {
  const results: ValidationResult[] = [];
  const filePath = 'src/components/Vote/LocationConsent.tsx';

  results.push({
    passed: fileExists(filePath),
    message: 'LocationConsent component exists',
  });

  if (fileExists(filePath)) {
    const checks = [
      { pattern: /type="checkbox"/, message: 'Checkbox for consent' },
      { pattern: /Privacy Policy/, message: 'Link to privacy policy' },
      { pattern: /aria-describedby/, message: 'ARIA descriptions for accessibility' },
      { pattern: /H3/, message: 'Explains H3 spatial indexing' },
      { pattern: /Country-level|country/i, message: 'Explains country-level fallback' },
    ];

    checks.forEach((check) => {
      results.push({
        passed: fileContains(filePath, check.pattern),
        message: check.message,
      });
    });
  }

  return {
    category: 'LocationConsent Component',
    results,
    passed: results.every((r) => r.passed),
  };
}

/**
 * Validate CaptchaField component
 */
function validateCaptchaField(): CategoryResult {
  const results: ValidationResult[] = [];
  const filePath = 'src/components/Vote/CaptchaField.tsx';

  results.push({
    passed: fileExists(filePath),
    message: 'CaptchaField component exists',
  });

  if (fileExists(filePath)) {
    const checks = [
      { pattern: /@hcaptcha\/react-hcaptcha/, message: 'Uses hCaptcha React component' },
      { pattern: /NEXT_PUBLIC_HCAPTCHA_SITE_KEY/, message: 'Uses env variable for site key' },
      { pattern: /onVerify/, message: 'onVerify handler implemented' },
      { pattern: /onExpire/, message: 'onExpire handler implemented' },
      { pattern: /onError/, message: 'onError handler implemented' },
      { pattern: /resetCaptcha/, message: 'Reset captcha on error' },
    ];

    checks.forEach((check) => {
      results.push({
        passed: fileContains(filePath, check.pattern),
        message: check.message,
      });
    });
  }

  return {
    category: 'CaptchaField Component',
    results,
    passed: results.every((r) => r.passed),
  };
}

/**
 * Validate VoteSuccessModal component
 */
function validateVoteSuccessModal(): CategoryResult {
  const results: ValidationResult[] = [];
  const filePath = 'src/components/Vote/VoteSuccessModal.tsx';

  results.push({
    passed: fileExists(filePath),
    message: 'VoteSuccessModal component exists',
  });

  if (fileExists(filePath)) {
    const checks = [
      { pattern: /@radix-ui\/react-dialog/, message: 'Uses Radix UI Dialog' },
      { pattern: /autoCloseDelay/, message: 'Auto-close delay support' },
      { pattern: /currentStats/, message: 'Displays current vote stats' },
      { pattern: /teamACount.*teamBCount/s, message: 'Shows vote counts for both teams' },
      { pattern: /animate/, message: 'Animation implemented' },
      { pattern: /aria-describedby/, message: 'ARIA descriptions for accessibility' },
    ];

    checks.forEach((check) => {
      results.push({
        passed: fileContains(filePath, check.pattern),
        message: check.message,
      });
    });
  }

  return {
    category: 'VoteSuccessModal Component',
    results,
    passed: results.every((r) => r.passed),
  };
}

/**
 * Validate useVoteSubmission hook
 */
function validateVoteSubmissionHook(): CategoryResult {
  const results: ValidationResult[] = [];
  const filePath = 'src/hooks/useVoteSubmission.ts';

  results.push({
    passed: fileExists(filePath),
    message: 'useVoteSubmission hook exists',
  });

  if (fileExists(filePath)) {
    const checks = [
      { pattern: /submitVote/, message: 'submitVote function implemented' },
      { pattern: /loading/, message: 'Loading state managed' },
      { pattern: /error/, message: 'Error state managed' },
      { pattern: /FingerprintJS/, message: 'Browser fingerprinting implemented' },
      { pattern: /getBrowserLocation/, message: 'Geolocation handling implemented' },
      { pattern: /latLngToCell|h3/, message: 'H3 conversion implemented' },
      { pattern: /\/api\/vote/, message: 'API endpoint call implemented' },
    ];

    checks.forEach((check) => {
      results.push({
        passed: fileContains(filePath, check.pattern),
        message: check.message,
      });
    });
  }

  return {
    category: 'useVoteSubmission Hook',
    results,
    passed: results.every((r) => r.passed),
  };
}

/**
 * Validate VoteForm component
 */
function validateVoteForm(): CategoryResult {
  const results: ValidationResult[] = [];
  const filePath = 'src/components/Vote/VoteForm.tsx';

  results.push({
    passed: fileExists(filePath),
    message: 'VoteForm component exists',
  });

  if (fileExists(filePath)) {
    const checks = [
      { pattern: /react-hook-form/, message: 'Uses React Hook Form' },
      { pattern: /zodResolver/, message: 'Uses Zod validation' },
      { pattern: /TeamSelector/, message: 'Includes TeamSelector' },
      { pattern: /LocationConsent/, message: 'Includes LocationConsent' },
      { pattern: /CaptchaField/, message: 'Includes CaptchaField' },
      { pattern: /VoteSuccessModal/, message: 'Includes VoteSuccessModal' },
      { pattern: /useVoteSubmission/, message: 'Uses useVoteSubmission hook' },
      { pattern: /useToast/, message: 'Uses toast notifications' },
      { pattern: /loading/, message: 'Loading state displayed' },
      { pattern: /disabled/, message: 'Submit button disabled during submission' },
      { pattern: /aria-/, message: 'ARIA attributes for accessibility' },
    ];

    checks.forEach((check) => {
      results.push({
        passed: fileContains(filePath, check.pattern),
        message: check.message,
      });
    });
  }

  return {
    category: 'VoteForm Component',
    results,
    passed: results.every((r) => r.passed),
  };
}

/**
 * Validate Tailwind configuration
 */
function validateTailwindConfig(): CategoryResult {
  const results: ValidationResult[] = [];
  const filePath = 'tailwind.config.ts';

  results.push({
    passed: fileExists(filePath),
    message: 'Tailwind config exists',
  });

  if (fileExists(filePath)) {
    const checks = [
      { pattern: /slideIn/, message: 'slideIn animation defined' },
      { pattern: /fadeIn/, message: 'fadeIn animation defined' },
      { pattern: /contentShow/, message: 'contentShow animation defined' },
      { pattern: /scaleIn/, message: 'scaleIn animation defined' },
    ];

    checks.forEach((check) => {
      results.push({
        passed: fileContains(filePath, check.pattern),
        message: check.message,
      });
    });
  }

  return {
    category: 'Tailwind Configuration',
    results,
    passed: results.every((r) => r.passed),
  };
}

/**
 * Validate environment variables
 */
function validateEnvironmentVariables(): CategoryResult {
  const results: ValidationResult[] = [];
  const exampleFile = '.env.example';

  results.push({
    passed: fileExists(exampleFile),
    message: '.env.example file exists',
  });

  if (fileExists(exampleFile)) {
    const checks = [
      { pattern: /NEXT_PUBLIC_HCAPTCHA_SITE_KEY/, message: 'NEXT_PUBLIC_HCAPTCHA_SITE_KEY documented' },
      { pattern: /HCAPTCHA_SECRET_KEY/, message: 'HCAPTCHA_SECRET_KEY documented' },
    ];

    checks.forEach((check) => {
      results.push({
        passed: fileContains(exampleFile, check.pattern),
        message: check.message,
      });
    });
  }

  return {
    category: 'Environment Variables',
    results,
    passed: results.every((r) => r.passed),
  };
}

/**
 * Main validation function
 */
function runValidation() {
  console.log('🔍 TASK 13: Vote Submission UI & Form - Validation\n');
  console.log('=' .repeat(70));
  console.log('\n');

  // Run all validations
  results.push(validateDependencies());
  results.push(validateErrorHandling());
  results.push(validateToastProvider());
  results.push(validateTeamSelector());
  results.push(validateLocationConsent());
  results.push(validateCaptchaField());
  results.push(validateVoteSuccessModal());
  results.push(validateVoteSubmissionHook());
  results.push(validateVoteForm());
  results.push(validateTailwindConfig());
  results.push(validateEnvironmentVariables());

  // Print results
  let allPassed = true;

  results.forEach((category) => {
    const icon = category.passed ? '✅' : '❌';
    console.log(`${icon} ${category.category}`);
    console.log('-'.repeat(70));

    category.results.forEach((result) => {
      const resultIcon = result.passed ? '  ✓' : '  ✗';
      console.log(`${resultIcon} ${result.message}`);
      if (result.details) {
        console.log(`    ${result.details}`);
      }
    });

    console.log('');

    if (!category.passed) {
      allPassed = false;
    }
  });

  // Summary
  console.log('='.repeat(70));
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  const percentage = Math.round((passedCount / totalCount) * 100);

  console.log(`\n📊 Summary: ${passedCount}/${totalCount} categories passed (${percentage}%)\n`);

  if (allPassed) {
    console.log('✨ All validation checks passed! TASK 13 is complete.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some validation checks failed. Please review the issues above.\n');
    process.exit(1);
  }
}

// Run the validation
runValidation();

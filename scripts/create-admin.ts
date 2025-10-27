#!/usr/bin/env tsx

import * as readline from 'readline';
import { createAdmin } from '../src/services/auth-service';
import { logger } from '../src/lib/logger';

/**
 * Create readline interface for user input
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt user for input
 */
function prompt(question: string): Promise<string> {
  const rl = createInterface();

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Prompt for password (hidden input)
 * Note: This is a simple implementation. For production, consider using a library like 'read'
 */
async function promptPassword(question: string): Promise<string> {
  const rl = createInterface();

  return new Promise((resolve) => {
    // Disable echo for password input
    if (process.stdin.isTTY) {
      (process.stdin as any).setRawMode(true);
    }

    process.stdout.write(question);

    let password = '';

    process.stdin.on('data', (char) => {
      const str = char.toString('utf8');

      switch (str) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl-D
          process.stdout.write('\n');
          if (process.stdin.isTTY) {
            (process.stdin as any).setRawMode(false);
          }
          process.stdin.pause();
          rl.close();
          resolve(password);
          break;
        case '\u0003': // Ctrl-C
          process.exit(0);
          break;
        case '\u007f': // Backspace
          password = password.slice(0, -1);
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(question + '*'.repeat(password.length));
          break;
        default:
          password += str;
          process.stdout.write('*');
          break;
      }
    });
  });
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Main function to create admin user
 */
async function main() {
  console.log('='.repeat(50));
  console.log('Admin User Creation Script');
  console.log('='.repeat(50));
  console.log('');

  try {
    // Prompt for username
    let username = '';
    while (!username) {
      username = await prompt('Enter username: ');
      if (!username) {
        console.log('Username cannot be empty. Please try again.');
      } else if (username.length < 3) {
        console.log('Username must be at least 3 characters long.');
        username = '';
      } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        console.log('Username can only contain letters, numbers, underscores, and hyphens.');
        username = '';
      }
    }

    // Prompt for email
    let email = '';
    while (!email) {
      email = await prompt('Enter email: ');
      if (!email) {
        console.log('Email cannot be empty. Please try again.');
      } else if (!isValidEmail(email)) {
        console.log('Invalid email format. Please try again.');
        email = '';
      }
    }

    // Prompt for password
    let password = '';
    let confirmPassword = '';

    while (!password || password !== confirmPassword) {
      password = await promptPassword('Enter password: ');

      if (!password) {
        console.log('Password cannot be empty. Please try again.');
        continue;
      }

      // Check password requirements
      if (password.length < 8) {
        console.log('Password must be at least 8 characters long.');
        password = '';
        continue;
      }

      confirmPassword = await promptPassword('Confirm password: ');

      if (password !== confirmPassword) {
        console.log('Passwords do not match. Please try again.');
        password = '';
        confirmPassword = '';
      }
    }

    console.log('');
    console.log('Creating admin user...');

    // Create admin user
    const admin = await createAdmin(username, password, email);

    console.log('');
    console.log('='.repeat(50));
    console.log('Admin user created successfully!');
    console.log('='.repeat(50));
    console.log('');
    console.log('Admin Details:');
    console.log(`  ID:       ${admin.id}`);
    console.log(`  Username: ${admin.username}`);
    console.log(`  Email:    ${admin.email}`);
    console.log(`  Created:  ${admin.created_at}`);
    console.log('');
    console.log('You can now use these credentials to log in.');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('Error creating admin user:');

    if (error instanceof Error) {
      console.error(`  ${error.message}`);

      if (error.message.includes('Username already exists')) {
        console.error('  Please choose a different username.');
      } else if (error.message.includes('Email already exists')) {
        console.error('  Please use a different email address.');
      } else if (error.message.includes('Password validation failed')) {
        console.error('  Please ensure your password meets all requirements:');
        console.error('    - At least 8 characters long');
        console.error('    - Contains at least one uppercase letter');
        console.error('    - Contains at least one lowercase letter');
        console.error('    - Contains at least one number');
        console.error('    - Contains at least one special character');
      }
    } else {
      console.error('  An unknown error occurred');
    }

    console.error('');
    logger.error('Admin creation script failed', { error });
    process.exit(1);
  }
}

// Run the script
main();

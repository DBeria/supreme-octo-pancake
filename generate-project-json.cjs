// A smarter script to automatically scan a project and create a JSON bundle.
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
// The root directory of the project you want to scan. '.' means the current directory.
const PROJECT_ROOT = '.'; 
// The name of the final JSON file.
const OUTPUT_FILE = 'project-bundle.json'; 
// A description for the project.
const DESCRIPTION = "This file contains the complete, final, and fully integrated code for the Online Medical Courses Platform, now featuring a full Content Management System (CMS) for creating and managing courses, lessons, and quizzes.";
// List of files, folders, and extensions to ignore.
const IGNORE_PATTERNS = [
    'node_modules',
    '.git',
    '.vscode',
    'dist',
    'build',
    '.DS_Store',
    // You should always ignore the script itself and its output!
    'generate-project-json.js',
    OUTPUT_FILE 
];
// --- END CONFIGURATION ---

const projectBundle = {
    description: DESCRIPTION,
    files: []
};

/**
 * Recursively traverses a directory and adds file contents to the bundle.
 * @param {string} currentPath - The current directory or file path to process.
 */
function traverseDirectory(currentPath) {
    // Check if the current path should be ignored
    const baseName = path.basename(currentPath);
    if (IGNORE_PATTERNS.includes(baseName)) {
        return;
    }

    // Get stats to check if it's a file or directory
    const stats = fs.statSync(currentPath);

    if (stats.isDirectory()) {
        // If it's a directory, read its contents and recurse
        const entries = fs.readdirSync(currentPath);
        for (const entry of entries) {
            traverseDirectory(path.join(currentPath, entry));
        }
    } else if (stats.isFile()) {
        // If it's a file, read its content
        try {
            const fileContent = fs.readFileSync(currentPath, 'utf8');
            // Get the relative path from the project root
            const relativePath = path.relative(PROJECT_ROOT, currentPath).replace(/\\/g, '/');

            // Add the file object to our array
            projectBundle.files.push({
                path: relativePath,
                content: fileContent
            });

            console.log(`+ Added: ${relativePath}`);
        } catch (error) {
            console.warn(`! Skipped (not plain text?): ${currentPath}`);
        }
    }
}

console.log('Starting project scan...');

// Start the traversal from the project root
traverseDirectory(PROJECT_ROOT);

// Convert the final object to a pretty-formatted JSON string
const jsonContent = JSON.stringify(projectBundle, null, 2);

// Write the JSON string to the output file
fs.writeFileSync(OUTPUT_FILE, jsonContent, 'utf8');

console.log(`\n✅ Success! Project has been bundled into ${OUTPUT_FILE}`);
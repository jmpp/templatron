#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

import inquirer from 'inquirer'
import Mustache from 'mustache'
import {
  createDirectory,
  createTemplatronDir,
  exitWithScriptError,
  findNearestTemplatronDir,
  getAnswers,
  getConfig,
  getConfirm,
  getHelp,
  makeFilesTree,
  parseAndGenerateFile,
} from './functions.js'

Mustache.tags = ['<%', '%>']

// TODO: Makes this configurable
const PRO_PATH = process.cwd()

let TEMPLATES_PATH = await findNearestTemplatronDir(PRO_PATH);

// If no /.templatron/ folder has been found, let's run initialization process
if (!TEMPLATES_PATH) {
  console.log("No .templatron directory was found in your project or global configuration.");
  
  const { ok } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'ok',
      message: 'Do you want to create one?',
      default: true,
    }
  ]);
  
  if (!ok) {
    process.exit(0);
  }
  
  // Demander où créer le dossier .templatron
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const { location } = await inquirer.prompt([
    {
      type: 'list',
      name: 'location',
      message: 'Where do you want to initialize /.templatron/ folder?',
      choices: [
        { name: `In your home directory ${homeDir} (better for global templates)`, value: 'home' },
        { name: `In the current working directory ${PRO_PATH} (better for project configuration)`, value: 'cwd' }
      ]
    }
  ]);
  
  if (location === 'home') {
    TEMPLATES_PATH = await createTemplatronDir(path.join(homeDir, '.templatron'));
  } else {
    TEMPLATES_PATH = await createTemplatronDir(path.join(PRO_PATH, '.templatron'));
  }
  
  console.log(`\nSuccessfully created! ${TEMPLATES_PATH}\n\nNow you may want to run \`templatron --help\` to list available templates.\n\nFeel free to adapt the example to fit your needs\n`);

  process.exit(0)
}

// Checks command invocation
const ARGV = process.argv
  .slice(2)
  .map((arg) => (arg.startsWith('--') ? arg.slice(2) : arg))

// If number of arguments is lower than expected or if we explicitely asked for help…
if (ARGV.length === 0 || (ARGV[0] === 'help' && ARGV.length === 1)) {
  const templatesList = await fs.readdir(TEMPLATES_PATH)
  console.log(getHelp(templatesList, TEMPLATES_PATH))
  process.exit(0)
}

// Get template name and element name
const template = ARGV[0]
const name = ARGV[1]

// -------------
// Script starts
// -------------

try {
  // Get list of available templates in /_templates/ folder
  const templatesList = await fs.readdir(TEMPLATES_PATH)

  if (!templatesList.includes(template)) {
    exitWithScriptError(`Unknown template: ${template}\n${getHelp(templatesList, TEMPLATES_PATH)}`)
  }

  // Loads config file for the selected template
  const templatePath = path.join(TEMPLATES_PATH, template)
  const config = await getConfig(templatePath)

  // Asks for user input
  const answers = await getAnswers(config.filesToGenerate, name)

  // Prepares data for mustache template
  const templateData = {
    name,
    ...Object.fromEntries(
      Object.entries(answers)
        .filter(([key]) => key !== 'targetDirectory')
        .map(([key, value]) => [
          key,
          { yes: value === 'Yes', no: value === 'No' },
        ])
    ),
  }

  // Computes final target directory that will contain the generated files
  const targetDirectory = path.join(
    PRO_PATH,
    answers.targetDirectory,
    answers.createNewDirectory ? name : ''
  )

  // Computes a list of files to generate, depending on what the user selected at previous step
  const confirmedFilesToGenerate = config.filesToGenerate
    .filter(
      (file, index) =>
        index === 0 ||
        (answers[file.varName] === 'Yes' && !!file.templateFileName)
    )
    .map((file) => ({
      templateFileName: path.join(templatePath, file.templateFileName),
      renderedFileName: path.join(
        targetDirectory,
        Mustache.render(file.templateFileName.replace('.mustache', ''), {
          name,
        })
      ),
      data: templateData,
    }))

  // Presents a tree of files that are going to be generated …
  console.log('\nThis will generate all these files:\n')
  console.log(
    makeFilesTree({
      baseRoot: path.join(PRO_PATH, answers.targetDirectory),
      newDirectoryName: answers.createNewDirectory ? name : null,
      fileNames: confirmedFilesToGenerate.map(({ renderedFileName }) =>
        path.basename(renderedFileName)
      ),
    }),
    '\n'
  )

  // … and asks for confirmation before creating files
  const confirm = await getConfirm()

  if (!confirm.ok) {
    exitWithScriptError('Cancelled')
  }

  // Creates directory for the new template files if user selected it
  if (answers.createNewDirectory) {
    await createDirectory(targetDirectory)
  }

  // Generate files
  await Promise.all(confirmedFilesToGenerate.map(parseAndGenerateFile))

  // Present report of generated files
  console.log('\n✅ Successfully generated files:\n')
  console.log(
    confirmedFilesToGenerate
      .map(({ renderedFileName }) => ` - ${renderedFileName}`)
      .join('\n'),
    '\n'
  )
} catch (err) {
  exitWithScriptError(err.message)
}

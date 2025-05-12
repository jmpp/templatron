#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

import { program } from 'commander'
import Mustache from 'mustache'
import {
  createDirectory,
  exitWithScriptError,
  findNearestTemplatronDir,
  getAnswers,
  getAvailableTemplates,
  getConfig,
  getConfirm,
  initializeTemplatron,
  makeFilesTree,
  parseAndGenerateFile
} from './functions.js'

Mustache.tags = ['<%', '%>']

const CWD = process.cwd()

// CLI configuration

program
  .version('1.0.2-beta', '-v, --version')
  .usage('<template> <name>\n       templatron [options]')
  .option('-l, --list', 'list available templates for current working directory')
  .argument('[template]', 'Name of the template to use (see --list option)')
  .argument('[name]', 'Name of the file to create with the template')
  .allowExcessArguments(false)
  .allowUnknownOption(false)

program.parse()

const OPTS = program.opts()
const ARGS = program.args;

const TEMPLATES_PATH = await findNearestTemplatronDir(CWD);

if (!TEMPLATES_PATH) {
  await initializeTemplatron()
}

// Listing available templates if asked
if (OPTS.list) {
  const filesList = await fs.readdir(TEMPLATES_PATH, { withFileTypes: true })
  const templatesList = filesList.filter(file => file.isDirectory()).map(file => file.name)
  console.log(getAvailableTemplates(templatesList, TEMPLATES_PATH), '\n')
  process.exit(0)
}

if (!OPTS.list && (!ARGS[0] || !ARGS[1])) {
  exitWithScriptError('Arguments [template] and [name] are required\n\nFor more info:\n\n  templatron --help')
}

// Get arguments template name and element's name
const template = program.args[0]
const name = program.args[1]

// -------------
// Script starts
// -------------

try {
  // Get list of available templates in /_templates/ folder
  const templatesList = await fs.readdir(TEMPLATES_PATH)

  if (!templatesList.includes(template)) {
    exitWithScriptError(`Unknown template: ${template}\n${getAvailableTemplates(templatesList, TEMPLATES_PATH)}`)
  }

  // Loads config file for the selected template
  const templatePath = path.join(TEMPLATES_PATH, template)
  const config = await getConfig(templatePath)

  console.log(`\n   🤖 Using template \x1b[33m${templatePath}\x1b[0m …\n`)

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
    CWD,
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
      baseRoot: path.join(CWD, answers.targetDirectory),
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

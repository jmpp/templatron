import fs from 'node:fs/promises'
import path from 'node:path'

import inquirer from 'inquirer'
import inquirerFuzzyPath from 'inquirer-fuzzy-path'
import Mustache from 'mustache'
import { fileURLToPath } from 'node:url'
import { printTree } from 'tree-dump'
import { toCamelCase, toKebabCase, toLowerCase, toSnakeCase, toUpperCase } from './helpers.js'

inquirer.registerPrompt('fuzzypath', inquirerFuzzyPath)

Mustache.tags = ['<%', '%>']

export const exitWithScriptError = (message) => {
  console.log(`\n❌ ${message}\n`)
  process.exit(1)
}

export const findNearestTemplatronDir = async (startDir) => {
  let currentDir = startDir
  
  while (currentDir !== path.parse(currentDir).root) {
    const templatronPath = path.join(currentDir, '.templatron')
    try {
      const stats = await fs.stat(templatronPath)
      if (stats.isDirectory()) {
        return templatronPath
      }
    } catch (err) {
      // Folder doesn't exists. Continue searching…
    }
    currentDir = path.dirname(currentDir)
  }
  
  return null
}

export const initializeTemplatron = async () => {
  console.log("\n🤖 No \x1b[33m.templatron/\x1b[0m directory was found in your project or global configuration.\n");

  const CWD = process.cwd()
  
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
  
  // Ask where to create /.templatron/ folder
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const { location } = await inquirer.prompt([
    {
      type: 'list',
      name: 'location',
      message: 'Where do you want to put \x1b[33m.templatron/\x1b[0m folder?',
      choices: [
        { name: `In your home directory \x1b[33m(${homeDir}/.templatron)\x1b[0m`, value: 'home' },
        { name: `In the current working directory \x1b[33m(${CWD}/.templatron)\x1b[0m`, value: 'cwd' }
      ]
    }
  ]);
  
  let templates_path;
  if (location === 'home') {
    templates_path = await createTemplatronDir(path.join(homeDir, '.templatron'));
  } else {
    templates_path = await createTemplatronDir(path.join(CWD, '.templatron'));
  }
  
  console.log(`\n✅ Directory \x1b[33m${templates_path}\x1b[0m successfully created with an example template!\n\nRun \x1b[33m\`templatron --list\`\x1b[0m to list available templates.\n\nFeel free to adapt the \`/example/\` template folder to fit your needs\n`);

  process.exit(0)
}

export const createTemplatronDir = async (targetDir) => {
  await createDirectory(targetDir);
  
  await copyTemplate('template_example', targetDir, 'example');
  
  return targetDir;
}

const copyTemplate = async (sourceDir, destinationDir, dirname = sourceDir) => {
  try {
    // Copy example files
    const templateExamplePath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      sourceDir
    );
  
  const files = await fs.readdir(templateExamplePath);
  const destFolderPath = path.join(destinationDir, dirname)
  await fs.mkdir(destFolderPath)
  
  for (const file of files) {
    const sourcePath = path.join(templateExamplePath, file);
    const destFilePath = path.join(destFolderPath, file);
      await fs.copyFile(sourcePath, destFilePath);
    }
  } catch (err) {
    exitWithScriptError(`Could not copy template: ${err.message}`)
  }
}

export const createTemplate = async (newTemplateName) => {
  const TEMPLATES_PATH = await findNearestTemplatronDir(process.cwd());

  if (!TEMPLATES_PATH) {
    exitWithScriptError('No \x1b[33m.templatron/\x1b[0m directory was found in your project or global configuration.\n\nRun \x1b[33m\`templatron\`\x1b[0m to create one.')
  }

  await copyTemplate('template_init', TEMPLATES_PATH, newTemplateName);
  
  console.log(`\n✅ Template \x1b[33m${newTemplateName}\x1b[0m successfully created in \x1b[33m${TEMPLATES_PATH}\x1b[0m\n\nRun \x1b[33m\`templatron --list\`\x1b[0m to list available templates.\n`);

  process.exit(0)
}

export const removeTemplate = async (templateName) => {
  const TEMPLATES_PATH = await findNearestTemplatronDir(process.cwd());

  if (!TEMPLATES_PATH) {
    exitWithScriptError('No \x1b[33m.templatron/\x1b[0m directory was found in your project or global configuration.\n\nRun \x1b[33m\`templatron\`\x1b[0m to create one.')
  }
  
  const pathToRemove = path.join(TEMPLATES_PATH, templateName);

  try {
    if ((await fs.stat(pathToRemove)).isDirectory()) {

      const { ok } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'ok',
          message: '\nAre you sure you want to remove this template?',
        }
      ]); 

      if (ok) {
        await fs.rm(pathToRemove, { recursive: true, force: true });
      } else {
        exitWithScriptError('Operation aborted: User cancelled')
      }

      console.log(`\n✅ Template \x1b[33m${templateName}\x1b[0m successfully removed from \x1b[33m${TEMPLATES_PATH}\x1b[0m\n\nRun \x1b[33m\`templatron --list\`\x1b[0m to list available templates.\n`);

      process.exit(0)
    } else {
      exitWithScriptError(`Template \x1b[33m${templateName}\x1b[0m not found.`)
    }
  } catch (err) {
    exitWithScriptError(`Could not remove template: ${err.message}`)
  }
}

export const getAvailableTemplates = (availableTemplates, templatePath) => {
  if (availableTemplates.length === 0) {
    return `\nNo templates found in \x1b[33m${templatePath}\x1b[0m\n\nRun \x1b[33m\`templatron --create <template_name>\`\x1b[0m to create a new template.\n`
  }

  let helpText = `\nAvailable templates in \x1b[33m${templatePath}\x1b[0m :\n\n`
  availableTemplates.forEach((tpl) => {
    helpText += `     templatron ${tpl} <name>\n`
  })
  return helpText
}

export const getConfig = async (templatePath) => {
  try {
    return (await import(path.join(templatePath, 'config.mjs'))).default
  } catch (err) {
    throw new Error(`Cannot find config file in \x1b[33m${templatePath}\x1b[0m`)
  }
}

export const getAnswers = async (configFilesToGenerate, name = null) => {
  const inquirerQuestions = configFilesToGenerate
    .filter((file) => !!file.question && !!file.varName)
    .map((file) => ({
      type: 'list',
      name: file.varName,
      message: file.question,
      choices: ['Yes', 'No'],
    }))

  try {
    return await inquirer.prompt(
      [
        {
          type: 'fuzzypath',
          name: 'targetDirectory',
          excludePath: (nodePath) => nodePath.includes('node_modules') || nodePath.includes('.git') || nodePath.includes('.templatron'),
          itemType: 'directory',
          rootPath: './', // TODO: makes this configurable
          message: 'Target directory?',
        },
        name && {
          type: 'confirm',
          name: 'createNewDirectory',
          message: `Create sub-directory /${name}/ ?`,
          default: true,
        },
        ...inquirerQuestions,
      ].filter(Boolean)
    )
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      throw new Error(`Operation aborted: User cancelled`)
    }
    throw new Error(`Could not get answers: ${err.message}`)
  }
}

export const getConfirm = async () => {
  try {
    return await inquirer.prompt([
      {
        type: 'confirm',
        name: 'ok',
        message: 'Is that ok?',
        default: true,
      },
    ])
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      throw new Error(`Operation aborted: User cancelled`)
    }
    throw new Error(`Could not get answers: ${err.message}`)
  }
}

export const makeFilesTree = ({ baseRoot, newDirectoryName, fileNames }) => {
  const treeContent = newDirectoryName
    ? [
        (tab) =>
          newDirectoryName +
          printTree(
            tab,
            fileNames.map((f) => () => f)
          ),
      ]
    : fileNames.map((f) => () => f)

  return baseRoot + printTree('', treeContent)
}

export const createDirectory = async (targetDirectory) => {
  try {
    await fs.mkdir(targetDirectory)
  } catch (err) {
    if (err.code === 'EEXIST') {
      throw new Error(`Directory already exists: ${targetDirectory}`)
    }
    throw new Error(`Could not create directory: ${err.message}`)
  }
}

export const parseAndGenerateFile = async ({
  templateFileName,
  renderedFileName,
  data,
}) => {
  try {
    // Parse Mustache file
    const templateContent = await fs.readFile(templateFileName, 'utf8')
    const parsedContent = Mustache.render(templateContent, {
      ...data,
      toKebabCase,
      toSnakeCase,
      toCamelCase,
      toUpperCase,
      toLowerCase
    })

    // Write new file parsed
    await fs.writeFile(renderedFileName, parsedContent, 'utf8')
  } catch (err) {
    throw new Error(
      `Could not create file: ${renderedFileName} (${err.message})`
    )
  }
}

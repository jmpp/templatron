import fs from 'node:fs/promises'
import path from 'node:path'

import inquirer from 'inquirer'
import inquirerFuzzyPath from 'inquirer-fuzzy-path'
import Mustache from 'mustache'
import { fileURLToPath } from 'node:url'
import { printTree } from 'tree-dump'

inquirer.registerPrompt('fuzzypath', inquirerFuzzyPath)

Mustache.tags = ['<%', '%>']

export const exitWithScriptError = (message) => {
  console.log(`\n❌ ${message}\n`)
  process.exit(1)
}

export const findNearestTemplatronDir = async (startDir) => {
  let currentDir = startDir;
  
  while (currentDir !== path.parse(currentDir).root) {
    const templatronPath = path.join(currentDir, '.templatron');
    try {
      const stats = await fs.stat(templatronPath);
      if (stats.isDirectory()) {
        return templatronPath;
      }
    } catch (err) {
      // Folder doesn't exists. Continue searching…
    }
    currentDir = path.dirname(currentDir);
  }
  
  return null;
};

export const createTemplatronDir = async (targetDir) => {
  await createDirectory(targetDir);
  
  // Copy example files
  const templateExamplePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'template_example'
  );
  
  const files = await fs.readdir(templateExamplePath);
  const destFolderPath = path.join(targetDir, 'example')
  await fs.mkdir(destFolderPath)
  
  for (const file of files) {
    const sourcePath = path.join(templateExamplePath, file);
    const destFilePath = path.join(destFolderPath, file);
    await fs.copyFile(sourcePath, destFilePath);
  }
  
  return targetDir;
};

export const getHelp = (availableTemplates, templatePath) => {
  let helpText = `\nAvailable templates in \x1b[33m${templatePath}\x1b[0m :\n\n`
  availableTemplates.forEach((tpl) => {
    helpText += `   templatron ${tpl} <name>\n`
  })
  helpText += '\n'
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
    })

    // Write new file parsed
    await fs.writeFile(renderedFileName, parsedContent, 'utf8')
  } catch (err) {
    throw new Error(
      `Could not create file: ${renderedFileName} (${err.message})`
    )
  }
}

// Internal mustache templates :

function toKebabCase() {
  return (str, render) =>
    render(str)
      .match(
        /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g
      )
      ?.map((x) => x.toLowerCase())
      .join('-')
}

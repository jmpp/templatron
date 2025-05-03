export default {
  templateFolderName: 'example',

  filesToGenerate: [

    // MANDATORY
    // This file will always be generated (because huh, you need at least one)
    {
      templateFileName: '<% name %>.tsx.mustache', // Final extension ".mustache" will be striped automatically
    },

    // OPTIONAL
    // Yes/No questions (put as much as you want)

    {
      templateFileName: '<% name %>.module.css.mustache',
      question: 'Generate SCSS module?',
      varName: 'scss', // A variable that you can use in ".mustache" templates to condition blocks of code
    },

    {
      templateFileName: '<% name %>.spec.tsx.mustache',
      question: 'Generate test file?',
      varName: 'spec',
    },
    
    {
      // "templateFileName" is optional.
      // Here we just want to have an additional variable "lazy" to use in ".mustache" files
      question: 'Will this component be lazy-loaded by react-router-dom?',
      varName: 'lazy',
    },

    // …
  ],
}

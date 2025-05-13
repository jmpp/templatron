export default {
  filesToGenerate: [

    // MANDATORY
    // This 1st file will always be generated (because huh, you need at least one)
    {
      templateFileName: '<% name %>.tsx.mustache', // Final extension ".mustache" will be striped automatically
    },

    // OPTIONAL
    // Yes/No questions associated to the .mustache template files in this path

    {
      question: 'Generate SCSS module?',                  // Question to ask while processing template
      varName: 'scss',                                    // A variable that will hold the answer "yes/no" to the question,
                                                          // and which you can use in all ".mustache" templates to condition blocks of code
      templateFileName: '<% name %>.module.css.mustache', // (Optional) Name of the file to generate if you answered "yes"
                                                          // If you don't want to generate a file but simply asks a question, remove this key
    },

    {
      question: 'Generate test file?',
      varName: 'spec',
      templateFileName: '<% name %>.spec.tsx.mustache',
    },
    
    {
      question: 'Will this component be lazy-loaded by react-router-dom?',
      varName: 'lazy',
    },

    // …
  ],
}

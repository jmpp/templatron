export default {
  filesToGenerate: [

    // MANDATORY
    // This 1st file will always be generated (because huh, you need at least one)
    {
      templateFileName: '<% name %>.txt.mustache', // Final extension ".mustache" will be striped automatically
    },

    // OPTIONAL
    // Yes/No questions associated to the .mustache template files in this path

    /*
      {
        question: string                          // Question to ask while processing template
        varName: string,                          // A variable that will hold the answer "yes/no" to the question,
                                                  // and which you can use in all ".mustache" templates to condition blocks of code
        templateFileName?: `${string}.mustache`,  // (Optional) Name of the file to generate if you answered "yes"
                                                  // If you don't want to generate a file but simply asks a question, remove this key
      },

      …
    */
  ],
}

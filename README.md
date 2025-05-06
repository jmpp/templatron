
<p align="center"><img src="docs/templatron.png" width="250" alt="Templatron" align="center"></p>

# Templatron

**The generator that scaffold YOUR own file templates** (currently in beta)

As a developer, you often need to create new code files that comply with the project's code and architecture standards (e.g. components, utils, services, API models … etc.)

And often, other files are also required, such as styles, storybooks, tests, documentation…. Creating them by hand (or copy/paste and adapting them) can quickly become tedious.

That's why I've created **Templatron** : a tool that allows you to generate files from templates that YOU define.

**Templatron** is a simple CLI tool that will generate a couple of files based on templates (written in Mustache), and will ask you the right questions to generate only the files you need in your scenario.

See an example of execution :

https://github.com/user-attachments/assets/be3398b0-01c6-4fbc-a491-7eb64d4aed8c

**Table of Contents**

- [Install](#install)
- [Generate a Utility File](#generate-a-utility-file)
- [(Bonus) Create Your Own File Generation Command ✨](#bonus-create-your-own-file-generation-command)

# Install

You can install templatron globally:

```bash
npm i -g templatron
```

or locally in your project:

```bash
npm i -D templatron
```

… and then add a script to your `package.json`:

```json
// package.json
  "scripts": {
    "templatron": "templatron"
  }
```

# Generate a React Component

Generate a component named **MyComponent**:

```bash
yarn generate:component MyComponent
```

This will prompt for the target directory where the component should be created:

```
? Target directory? (Use arrow keys or type to search)
❯ ./src
  src/apiClient
  src/apiClient/__specs__
  src/apiClient/adage
  src/apiClient/adage/core
  src/apiClient/adage/models
  src/apiClient/adage/services
(Move up and down to reveal more choices)
```

The utility will then ask if a subdirectory should be created for the generated files:

```
? Create sub-directory /MyComponent/ ? (Y/n)
```

You can then choose whether to generate files for the SCSS module, tests, and stories:

```
✔ Generate SCSS module? (Use arrow keys)
❯ Yes
  No

✔ Generate test file? (Use arrow keys)
❯ Yes
  No

✔ Generate storybook file? (Use arrow keys)
❯ Yes
  No
```

Finally, a summary will be displayed before final confirmation:

```
This will generate all these files:

/Users/jm/src/components
└─ MyComponent
   ├─ MyComponent.tsx
   ├─ MyComponent.module.scss
   ├─ MyComponent.spec.tsx
   └─ MyComponent.stories.tsx

? Is that ok? (Y/n)
```

If everything went well, a confirmation of the generated files will appear:

```
✅ Successfully generated files:

 - /Users/jm/src/components/MyComponent/MyComponent.tsx
 - /Users/jm/src/components/MyComponent/MyComponent.module.scss
 - /Users/jm/src/components/MyComponent/MyComponent.spec.tsx
 - /Users/jm/src/components/MyComponent/MyComponent.stories.tsx
```

# Generate a Utility File

Generate a utility named **myUtil**:

```bash
yarn generate:util myUtil
```

This will prompt for the target directory where the utility should be created:

```
? Target directory? (Use arrow keys or type to search)
❯ ./src
  src/apiClient
  src/apiClient/__specs__
  src/apiClient/adage
  src/apiClient/adage/core
  src/apiClient/adage/models
  src/apiClient/adage/services
(Move up and down to reveal more choices)
```

The utility will then ask if a subdirectory should be created for the generated files:

```
? Create sub-directory /myUtil/ ? (Y/n)
```

You can then choose whether to generate the spec file:

```
✔ Generate test file? (Use arrow keys)
❯ Yes
  No
```

Finally, a summary will be displayed before final confirmation:

```
This will generate all these files:

/Users/jm/src/utils
├─ myUtil.ts
└─ myUtil.spec.ts

✔ Is that ok? yes
```

If everything went well, a confirmation of the generated files will appear:

```
✅ Successfully generated files:

 - /Users/jm/src/utils/myUtil.ts
 - /Users/jm/src/utils/myUtil.spec.ts
```

# (Bonus) Create Your Own File Generation Command

You can create your own commands to generate files from templates.

The **yarn** command shortcuts must be specified in **package.json**:

```json
{
  "scripts": {
    "generate:new_command": "node ./scripts/generator/index.js --new_command"
  }
}
```

The new command should be invoked as follows:

```bash
yarn generate:new_command <ELEMENT_NAME>
```

Then, you need to create a folder **with the same name as the desired command** in the templates directory `./scripts/generator/_templates`.

The folder must include a configuration file `config.js` and one or more template files `.mustache`.

Example:

```
_templates
└─ new_command
   ├─ config.js
   ├─ <% name %>.ts.mustache
   └─ <% name %>.spec.ts.mustache
```

> [!WARNING]
>
> Currently, template subdirectories are not yet supported (work in progress)

The `.mustache` file names must include the desired extension (ts, js, tsx, ...) and can include the `<% name %>` variable which will be replaced by the `<ELEMENT_NAME>` value chosen when invoking the command.

## Configuration File `config.js`

The `config.js` file must export a default configuration object with the following properties:

```js
export default {
  templateFolderName: 'new_command',

  filesToGenerate: [
    // 1st file will always be generated
    {
      templateFileName: '<% name %>.ts.mustache',
    },
    // Yes/No questions ...
    {
      templateFileName: '<% name %>.spec.ts.mustache',
      question: 'Generate spec file?',
      varName: 'spec',
    },
    // ...
  ],
}
```

- `templateFolderName`: the name of the template folder to use
- `filesToGenerate`: an array of files to generate

The first object in the array **will always be generated**, and should only contain the `templateFileName` property.

The following objects will be generated if the confirmation question is validated by the user. The answer to the question is stored in the `varName` property of the configuration file, to be used in the `.mustache` templates.

## Template Files `.mustache`

Template files are compiled using [Mustache.js](https://github.com/janl/mustache.js).

Each file receives the following view object:

```js
{
  name: "<ELEMENT_NAME>", //
  spec: { yes: true, no: false }, // Based on user's answer
  // ...
}
```

The content of each `.mustache` file can thus read the value of `name` and `spec` to choose the code to generate:

```mustache
<%# spec.yes %>
// This will be present only if user answered "Yes" to the "spec" question
<%/ spec.yes %>

<#% spec.no %>
// This will be present only if user answered "No" to the "spec" question
<#/ spec.no %>

const <% name %> = "Hello World!"

// Rest of file to be generated ...
```

If the user invoked the command `yarn generate:new_command message` and chose "No" for the "spec" question, then the generated file would be:

```ts
// This will be present only if user answered "No" to the "spec" question

const message = 'Hello World!'

// Rest of file to be generated ...
```

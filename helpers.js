// Internal mustache templates :

export function toKebabCase() {
  return (str, render) =>
    render(str)
      .match(
        /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g
      )
      ?.map((x) => x.toLowerCase())
      .join('-')
}

export function toSnakeCase() {
  return (str, render) =>
    render(str)
      .match(
        /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g
      )
      ?.map((x) => x.toLowerCase())
      .join('_')
}

export function toCamelCase() {
  return (str, render) =>
    render(str).charAt(0).toLowerCase() + render(str).slice(1)
}

export function toUpperCase() {
  return (str, render) =>
    render(str).toUpperCase()
}

export function toLowerCase() {
  return (str, render) =>
    render(str).toLowerCase()
}

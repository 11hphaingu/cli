# Functionalities

## Setup Dev Environment

### Commands

```
Usage: h2to-cli setup-eslint-ts [options] [project-path]

setup typescript and eslint for nodejs project

Arguments:
  project-path                     .

Options:
  -bD, --build-dir [string]        path of build Dir (default: "dist")
  -tD, --test-dir [string]         path of test Dir (default: "__test__")
  -tscnf, --tsconfigpath [string]  tsconfig path for eslint parser (default: "tsconfig.json")
  --project-type [node|browser]    your project type (default: "node")
  --no-ts                          dont use ts ?
  --has-declaration-map            do you need generate declaration mapping for type building
  --is-sub-module                  is your project a package within a monorepo yarn context ?
  --include-paths [paths...]       paths should be percevied by typescript (default: [])
  -h, --help                       display help for command
```

### Steps

#### Setup tools and scripts

As per the specific project type, we have the correspondent deps for tools and
scripts for building and running or testing.

tools: ts-patter, yl-ddd-ts, fp-ts, ...
scripts: build, test, lint, ...

#### Setup Eslint

Setting up Eslint so we can harness linting technology to automatically clean
and consistent, and save us from common programming errors, or stylistic error.

We should try to enforce the same eslint configuration accross the projects

#### Setup Typescript

Setting up the TypeScript compiler enables strong typing in your project. This 
helps prevent errors by ensuring you pass the correct data types to functions 
and variables, leading to more reliable and maintainable code.


## Substack Harvester

You have subscribed to a publisher and you want to download all the archived
articles to your local machine so you can read them in the future. Our cli 
provision a functionality to export all article of your subscribing publisher
to pdf files.

```
Usage: h2to-cli harvest-substack [options] <publisher_url> <publisher_i>

harvesting substack publisher articles

Arguments:
  publisher_url                  publisher url
  publisher_i                    publisher id

Options:
  -max, --max_page [number]      max page (default: -1)
  -limit, --limit_page [number]  page size (default: 10)
  -h, --help                     display help for command
```
for example

```
yarn test-run harvest-substack blog.bytebytego.com bytebytego
```

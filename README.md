# Node.Options

The C# [Mono.Options](https://www.nuget.org/packages/Mono.Options/) framework for the Node.JS runtime.

## Installation

```shell
npm install @koschel-christoph/node.options
```

## Using the library

To use the `Node.Options` library in your project, follow the steps below.

### Step 1: Import the Library

First, import the `OptionSet` class from the library.

```typescript
import {OptionSet} from "@koschel-christoph/node.options";
```

### Step 2: Define Variables

Define the variables that will store the parsed command-line arguments.

```typescript
const sources: string[] = [];
let help: boolean = false;
let output: string = "";
```

### Step 3: Initialize OptionSet

Create an instance of `OptionSet` with the usage message and the options you want to parse.

```typescript
const option: OptionSet = new OptionSet(
    "Usage: mytool <sources> [options]",
    ["<>", "All sources that are used for mytool", v => sources.push(v)],
    ["o=|output=", "Terminates the {output} destination", v => output = v],
    ["h|help", "Prints a help string", () => help = true],
);
```

### Step 4: Parse Command-Line Arguments

Use the `parse` method to parse the command-line arguments.

```typescript
option.parse(process.argv);
```

### Step 5: Handle Help Option (Optional)

Check if the help flag is set, and if so, print the help message and exit the process.

```typescript
if (help) {
    option.printHelpString(process.stdout);
    process.exit(0);
}
```

### Step 6: Access Parsed Values

After parsing, the `sources` and `output` variables will contain the respective values from the command-line arguments.
You
can use these variables in your application.

```typescript
console.log(sources);
console.log(output);
```

### Complete Example

Here's the complete example code:

```typescript
// index.js
import {OptionSet} from "@koschel-christoph/node.options";

const sources: string[] = [];
let help: boolean = false;
let output: string = "";

const option: OptionSet = new OptionSet(
    "Usage: mytool <sources> [options]",
    ["<>", "All sources that are used for mytool", v => sources.push(v)],
    ["o=|output=", "Terminates the {output} destination", v => output = v],
    ["h|help", "Prints a help string", () => help = true],
);

option.parse(process.argv);

if (help) {
    option.printHelpString(process.stdout);
    process.exit(0);
}

console.log(sources);
console.log(output);
```

```bash
$ node index.js -h
Usage: mytool <sources> [options]
  <>                            All sources that are used for mytool
  -o=output, --output=output    Terminates the output destination
  -h, --help                    Prints a help string

$ node index.js fileA.txt fileB.txt fileC.txt -o fileD.txt
[ 'fileA.txt', 'fileB.txt', 'fileC.txt' ]
fileD.txt
```

## Detailed OptionSet Constructor

The `OptionSet` constructor takes a variable number of arguments, each of which defines an option or the usage message.
The arguments can be one of four types:

1. **Usage Message** (`OptionUsageArgument`)
2. **Field Argument** (`OptionFieldArgument`)
3. **Rest Argument** (`OptionRestArgument`)
4. **Flag Argument** (`OptionFlagArgument`)

### Usage Message

- **Type**: `OptionUsageArgument`
- **Format**: A single string that describes how to use the command-line tool.
- **Example**: `Usage: mytool <sources> [options]`

### Field Argument

- **Type**: `OptionFieldArgument`
- **Format**: `[keys, description, callback]`
- **Keys**: A string containing the key names followed by an `=` to indicate a field.
- **Description**: A string describing the option. Use {} to include a placeholder in the help string.
- **Callback**: A function that takes the value of the option.
- **Example**: `["o=|output=", "Terminates the {output} destination", v => output = v]`
- **Usage**: `mytool -o output.txt` or `mytool --output output.txt`

### Rest Argument

- **Type**: `OptionRestArgument`
- **Format**: `["<>", description, callback]`
- **Keys**: `"<>"`
- **Description**: A string describing the rest argument.
- **Callback**: A function that takes the value of each rest argument.
- **Example**: `["<>", "All sources that are used for mytool", v => sources.push(v)]`
- **Usage**: `mytool source1 source2 source3`

### Flag Argument

- **Type**: `OptionFlagArgument`
- **Format**: `[keys, description, callback]`
- **Keys**: A string containing the key names for the flag.
- **Description**: A string describing the flag.
- **Callback**: A function that is called when the flag is encountered.
- **Example**: `["h|help", "Prints a help string", () => help = true]`
- **Usage**: `mytool -h` or `mytool --help`

### Key Concatenation Rules

- **Valid Concatenation**: You can concatenate short and long forms of the same type of option.
    - **Example**: `["o=|output="]` (both expect a string value)
- **Invalid Concatenation**: You cannot concatenate different types of options.
    - **Invalid Example**: `["o=|option"]` (mixing a field and a flag)
    - **Invalid Example**: `["<>|sources"]` (mixing the rest operator with a regular option)

## Sub Commands

The `SubCommandSet` class can be used to defined sub commands in infinite depth.

### Step 1: Import the Library

First, import the `OptionSet` and `SubCommandSet` class from the library.

```typescript
import {OptionSet, SubCommandSet} from "@koschel-christoph/node.options";
```

### Step 2: Define default generator handler

Define a default handler that is used when the sub command is not found or is not provided

```typescript
function* base(handler: SubCommandSet, commandNotFound: boolean): Generator<OptionSet> {

}
```

### Step 3: Write OptionSet logic

Inside the generator function we know write our normal OptionSet logic except of yield return the `OptionSet` before
processing the result.

```typescript
function* base(handler: SubCommandSet, commandNotFound: boolean): Generator<OptionSet> {
    let help: boolean = false;
    const set: OptionSet = new OptionSet(
        ["h|help", "Prints this help text", () => help = true]
    );
    yield set;

    if (help) {
        handler.printHelpString(process.stdout);
    }
}
```

Everything before the yield can be seen as the setup phase. When the set is yield the SubCommandSet calls the
`OptionSet.parse` function and then continues the generator function.

### Step 4: Define sub command handler

Now the actual sub command handler must be defined this is also a generator function that returns either a `OptionSet`
or a `SubCommandSet` for nested sub commands.

```typescript
function* mySubCommand(handler: SubCommandSet): Generator<OptionSet | SubCommandSet> {
}
```

### Step 5: Write OptionSet or SubCommandSet logic

Inside the handler we write the logic of the sub command for `SubCommandSet` it is like going back to step 2.

```typescript
function* mySubCommand(handler: SubCommandSet): Generator<OptionSet | SubCommandSet> {
    let help: boolean = false;
    const set: OptionSet = new OptionSet(
        "Usage: mycommand subcommand [<option>]",
        ["h|help", "Prints this help text", () => help = true]
    );
    yield set;

    if (help) {
        set.printHelpString(process.stdout);
    }
}
```

### Step 6: Combine all functions

Now the only major thing is to bring all functions together. Therefore, we construct a `SubCommandSet` class.

```typescript
const set: SubCommandSet = new SubCommandSet(
    "Usage: mycommand [<subcommand>] [<option>]",
    base,
    ["subcommand", "A subcommands description", mySubCommand]
);
```

### Step 7: Parse Command-Line Arguments

Lastly we only need to parse our command arguments

```typescript
set.parse(process.argv);
```

### Complete Example

Here's the complete example code:

```typescript
import {OptionSet, SubCommandSet} from "@koschel-christoph/node.options";

function* base(handler: SubCommandSet, commandNotFound: boolean): Generator<OptionSet> {
    let help: boolean = false;
    const set: OptionSet = new OptionSet(
        ["h|help", "Prints this help text", () => help = true]
    );
    yield set;

    if (help) {
        handler.printHelpString(process.stdout);
    }
}

function* mySubCommand(handler: SubCommandSet): Generator<OptionSet | SubCommandSet> {
    let help: boolean = false;
    const set: OptionSet = new OptionSet(
        "Usage: mycommand subcommand [<option>]",
        ["h|help", "Prints this help text", () => help = true]
    );
    yield set;

    if (help) {
        set.printHelpString(process.stdout);
    }
}

const set: SubCommandSet = new SubCommandSet(
    "Usage: mycommand [<subcommand>] [<option>]",
    base,
    ["subcommand", "A subcommands description", mySubCommand]
);

set.parse(process.argv);
```

## Detailed SubCommandSet Constructor

The `SubCommandSet` constructor takes a variable number of arguments, each of which defines a sub command, the base
handler or the usage message. The arguments can be one of four types:

1. **Usage Message** (`SubCommandUsageArgument`)
2. **Base Handler** (`SubCommandBaseArgument`)
3. **Command Handler** (`SubCommandCommandArgument`)

### Usage Message

- **Type**: `SubCommandUsageArgument`
- **Format**: A single string that describes how to use the command-line tool.
- **Example**: `Usage: mytool <sources> [options]`

### Base Handler

- **Type**: `SubCommandBaseArgument`
- **Format**: A JavaScript generator function which returns a `Generator<OptionSet>` type.

### Command Handler

- **Type**: `SubCommandCommandArgument`
- **Format**: `[command, description, handler]`
- **Command**: A string containing the name of the sub command.
- **Description**: A string describing the sub command.
- **Handler**: A JavaScript generator function which returns a `Generator<OptionSet | SubCommandSet>` type.
- **Example**: `["mySubCommand", "My sub command doing smth.", myHanlder]`

## Configuration Flags

The `Node.Options` library includes two configuration flags that control how command-line options are parsed: `strict`
and `caseSensitive`.

### OptionSet.strict

- **Default Value**: true
- **Description**: When `strict` is enabled, options must adhere to the GNU standard for flag prefixes. Specifically,
  single-character flags must be prefixed with a single hyphen (`-`), and multi-character flags must be prefixed with
  double hyphens (`--`). If strict is disabled, the library is more lenient and allows non-standard flag formats.

#### Example with strict enabled (default)

```typescript
const option: OptionSet = new OptionSet(
    "Usage: mytool <sources> [options]",
    ["<>", "All sources that are used for mytool", v => sources.push(v)],
    ["o=|output=", "Terminates the {output} destination", v => output = v],
    ["h|help", "Prints a help string", () => help = true],
);

option.strict = true;

option.parse(process.argv);

// Example usage
// Command: mytool -output out.txt 
// Result: `-output` is handled as a rest argument because it does not follow the GNU standard
```

#### Example with strict disabled

```typescript
const option: OptionSet = new OptionSet(
    "Usage: mytool <sources> [options]",
    ["<>", "All sources that are used for mytool", v => sources.push(v)],
    ["o=|output=", "Terminates the {output} destination", v => output = v],
    ["h|help", "Prints a help string", () => help = true],
);

option.strict = false;

option.parse(process.argv);

// Example usage
// Command: mytool -output out.txt 
// Result: `-output` is accepted as a valid flag and `output` is set to "out.txt"
```

### OptionSet.caseSensitive / SubCommandSet.caseSensitive

- **Default Value**: true
- **Description**: When `caseSensitive` is enabled, the keys for options or sub commands are case-sensitive. This means
  that `--Output`
  and `--output` would be considered different options. When caseSensitive is disabled, the comparison is
  case-insensitive, treating `--Output` and `--output` as the same option. The same rule applies to sub commands where
  `subCommand` and `subcommand` are treated as the same command.

#### Example with caseSensitive enabled (default)

```typescript
const option: OptionSet = new OptionSet(
    "Usage: mytool <sources> [options]",
    ["<>", "All sources that are used for mytool", v => sources.push(v)],
    ["o=|output=", "Terminates the {output} destination", v => output = v],
    ["h|help", "Prints a help string", () => help = true],
);

option.parse(process.argv);

// Example usage
// Command: mytool --Output out.txt
// Result: `--Output` is treated as an invalid option and is therefore handled as a rest parameter
```

#### Example with caseSensitive disabled

```typescript
const option: OptionSet = new OptionSet(
    "Usage: mytool <sources> [options]",
    ["<>", "All sources that are used for mytool", v => sources.push(v)],
    ["o=|output=", "Terminates the {output} destination", v => output = v],
    ["h|help", "Prints a help string", () => help = true],
);

option.caseSensitive = false;

option.parse(process.argv);

// Example usage
// Command: mytool --Output out.txt
// Result: `output` is set to "out.txt"
```

## Licensing

The `Node.Options` library is licensed under the MIT License. This license allows you to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the Software, under the following conditions:

### MIT License

```text
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
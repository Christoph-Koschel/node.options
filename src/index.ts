import * as fs from "fs";

export type OptionUsageArgument = string;
export type OptionFieldArgument = [`${string}=`, `${string}{${string}}${string}`, (v: string) => void];
export type OptionRestArgument = ["<>", string, (v: string) => void];
export type OptionFlagArgument = [string, string, () => void];

export type OptionSetConstructor = OptionUsageArgument | OptionFieldArgument | OptionRestArgument | OptionFlagArgument;

enum OptionType {
    FLAG,
    FIELD,
    REST
}

interface OptionSetOptions {
    strict: boolean;
    caseSensitive: boolean;
}

class Option<T extends OptionType> {
    public type: OptionType;
    public keys: string[];
    public executor: T extends OptionType.FLAG ? () => void : (v: string) => void;

    private descriptionKey: string;
    private description: string;

    public constructor(type: OptionType.FLAG, keys: string[], description: string, executor: () => void);
    public constructor(type: OptionType.FIELD, descriptionKey: string, keys: string[], description: string, executor: (v: string) => void);
    public constructor(type: OptionType.REST, description: string, executor: (v: string) => void);

    public constructor(...params:
                           [type: OptionType.FLAG, keys: string[], description: string, executor: () => void] |
                           [type: OptionType.FIELD, descriptionKey: string, keys: string[], description: string, executor: (v: string) => void] |
                           [type: OptionType.REST, description: string, executor: (v: string) => void]
    ) {
        switch (params[0]) {
            case OptionType.FLAG:
                this.constructFlag(...params);
                break;
            case OptionType.FIELD:
                this.constructField(...params);
                break;
            case OptionType.REST:
                this.constructRest(...params);
                break;

        }
    }

    private constructFlag(type: OptionType.FLAG, keys: string[], description: string, executor: () => void): void {
        this.type = type;
        this.descriptionKey = "";
        this.keys = keys;
        this.description = description;
        this.executor = executor;
    }

    private constructField(type: OptionType.FIELD, descriptionKey: string, keys: string[], description: string, executor: (v: string) => void): void {

        this.type = type;
        this.descriptionKey = descriptionKey;
        this.keys = keys.map(key => key.substring(0, key.length - 1));
        this.description = description;
        (this as Option<OptionType.FIELD>).executor = executor;
    }

    private constructRest(type: OptionType.REST, description: string, executor: (v: string) => void): void {
        this.type = type;
        this.descriptionKey = "";
        this.keys = ["<>"];
        this.description = description;
        (this as Option<OptionType.REST>).executor = executor;
    }

    print(stream: fs.WriteStream | NodeJS.WriteStream): void {
        stream.write("  ");
        const keyString: string = this.keys.map(key => {
            switch (this.type) {
                case OptionType.FLAG:
                    if (key.length == 1) {
                        return "-" + key;
                    }
                    return "--" + key;
                case OptionType.FIELD:
                    if (key.length == 1) {
                        return "-" + key + "=" + this.descriptionKey;
                    }
                    return "--" + key + "=" + this.descriptionKey;
                case OptionType.REST:
                    return "<>";
            }
        }).join(", ");
        const keyStringPadded: string = keyString.padEnd(29);
        stream.write(keyStringPadded);
        if (keyStringPadded == keyString) {
            stream.write("\n");
            stream.write("".padEnd(29));
        } else {
            stream.write(" ");
        }

        stream.write(this.description);
    }
}

export class OptionSet implements OptionSetOptions {
    private usageString: string | null = null;
    private readonly options: Option<any>[] = [];


    public strict: boolean = true;
    public caseSensitive: boolean = true;

    public constructor(...params: OptionSetConstructor[]) {
        this.options = [];
        let seenNames: Set<string> = new Set<string>();
        params.forEach((param) => {
            if (typeof param == "string") {
                this.usageString = param;
                return;
            }
            const [key, description, cb] = param;
            if (key == "<>") {
                if (!this.tryAdd(seenNames, key)) {
                    throw `A option with the key '${key}' already exist`;
                }
                this.options.push(new Option<OptionType.REST>(OptionType.REST, description, cb));
            } else {
                let keys: string[] = key.split("|").map(k => k.trim());
                if (keys.length == 0) {
                    throw "Need at least one Key";
                }
                let type: OptionType = OptionType.FLAG;

                for (const key of keys) {
                    const index: number = keys.indexOf(key);
                    if (!this.tryAdd(seenNames, key)) {
                        throw `A option with the key '${key}' already exist`;
                    }
                    if (index == 0) {
                        type = key.endsWith("=") ? OptionType.FIELD : OptionType.FLAG;
                    } else {
                        if (type == OptionType.FIELD && !key.endsWith("=")) {
                            throw `Option type cannot be changed after the first key, change '${key}' with '${key}='`;
                        } else if (type == OptionType.FLAG && key.endsWith("=")) {
                            throw `Option type cannot be changed after the first key, change '${key}=' with '${key}'`;
                        }
                    }
                }

                if (type == OptionType.FIELD) {
                    const match: RegExpMatchArray = description.match(/.*{(\w+)}.*/);
                    if (match == null || match.length == 0) {
                        throw "Options with a field type needs a keyword defined with braces e.g. 'The {path} of...'";
                    }
                    this.options.push(new Option<OptionType.FIELD>(type, match[1], keys, description.replace(/{(\w+)}/, sub => sub.substring(1, sub.length - 1)), cb));
                } else {
                    this.options.push(new Option<OptionType.FLAG>(type, keys, description, cb as () => void));
                }
            }
        });
    }

    private tryAdd<T>(set: Set<T>, value: T): boolean {
        if (set.has(value)) {
            return false;
        }

        set.add(value);
        return true;
    }

    public parse(args: string[], shiftFirstTwo: boolean = true): void {
        if (shiftFirstTwo) {
            args.shift();
            args.shift();
        }

        let restOption: Option<OptionType.REST> | undefined = this.options.find(option => option.type == OptionType.REST);

        outer:
            for (let i: number = 0; i < args.length; i++) {
                const current: string = args[i];
                const currentAsKey: string = this.formToKey(current);
                const next: string | null = i + 1 < args.length ? args[i + 1] : null;

                for (let j: number = 0; j < this.options.length; j++) {
                    if (this.options[j].keys.map(k => this.caseSensitive ? k : k.toLowerCase()).includes(currentAsKey)) {
                        if (this.options[j].type == OptionType.FIELD && next != null) {
                            let option: Option<OptionType.FIELD> = this.options[j];
                            option.executor(next);
                            i++;
                        } else if (this.options[j].type == OptionType.FLAG) {
                            let option: Option<OptionType.FLAG> = this.options[j];
                            option.executor();
                        }
                        continue outer;
                    }
                }

                if (restOption != null) {
                    restOption.executor(current);
                }
            }
    }

    private formToKey(str: string): string {
        let key: string = "";
        if (str.startsWith("--") && (this.strict && str.length > 3 || !this.strict)) {
            key = str.substring(2);
        }
        if (str.startsWith("-") && (this.strict && str.length == 2 || !this.strict)) {
            key = str.substring(1);
        }

        if (!this.caseSensitive) {
            key = key.toLowerCase();
        }

        return key;
    }

    public printHelpString(stream: fs.WriteStream | NodeJS.WriteStream): void {
        if (this.usageString != null) {
            stream.write(this.usageString + "\n");
        }
        this.options.forEach(option => {
            option.print(stream);
            stream.write("\n");
        });
    }
}

type SubCommandUsageArgument = string;
type SubCommandBaseArgument = (handler: SubCommandSet, commandNotFound: boolean) => Generator<OptionSet>;
type SubCommandCommandArgument = [string, string, (handler: SubCommandSet) => Generator<OptionSet | SubCommandSet>];

type SubCommandSetConstructor = SubCommandUsageArgument | SubCommandBaseArgument | SubCommandCommandArgument;

export class SubCommandSet {
    private usageString: string | null;
    private baseHandler: ((handler: SubCommandSet, commandNotFound: boolean) => Generator<OptionSet>) | null;
    private commands: Map<string, [string, (handler: SubCommandSet) => Generator<OptionSet | SubCommandSet>]>;
    private caseSensitive: boolean;

    public constructor(...handlers: SubCommandSetConstructor[]) {
        this.usageString = null;
        this.baseHandler = null;
        this.commands = new Map();
        this.caseSensitive = true;

        for (const handler of handlers) {
            if (typeof handler === "string") {
                this.usageString = handler;
                continue;
            }
            if (typeof handler === "function") {
                this.baseHandler = handler;
                continue;
            }
            if (this.commands.has(handler[0])) {
                throw `A sub command with the name '${handler[0]}' already exist`;
            }
            this.commands.set(handler[0], [handler[1], handler[2]]);
        }
    }

    public parse(args: string[], shiftFirstTwo: boolean = true): void {
        if (shiftFirstTwo) {
            args.shift();
            args.shift();
        }

        const command: string | undefined = args[0];
        if (!command) {
            this.executeBaseHandler(args, false);
            return;
        }

        if (this.commands.has(command) || (!this.caseSensitive && this.commands.has(command.toLowerCase()))) {
            args.shift();
            let wrap: [string, (handler: SubCommandSet) => Generator<OptionSet | SubCommandSet>] = this.commands.get(command);
            if (!this.caseSensitive && !wrap) {
                wrap = this.commands.get(command.toLowerCase())!;
            }
            const [_, handlerFunc] = wrap;

            const generator: Generator<OptionSet | SubCommandSet> = handlerFunc(this);
            const handler: OptionSet | SubCommandSet | undefined = generator.next().value;
            if (!handler || !(handler instanceof SubCommandSet) && !(handler instanceof OptionSet)) {
                throw "Function did not return a OptionSet or SubCommandSet";
            }
            handler.parse(args, false);
            generator.next();
            return;
        }

        this.executeBaseHandler(args, true);
    }

    private executeBaseHandler(args: string[], commandNotFound: boolean): void {
        if (this.baseHandler) {
            const generator: Generator<OptionSet> = this.baseHandler(this, commandNotFound);
            const handler: OptionSet | undefined = generator.next().value;
            if (!handler || !(handler instanceof OptionSet)) {
                throw "Function did not return a OptionSet";
            }
            handler.parse(args, false);
            generator.next();
        }
    }

    public printHelpString(stream: fs.WriteStream | NodeJS.WriteStream): void {
        if (this.usageString != null) {
            stream.write(this.usageString + "\n");
        }

        stream.write("\n");
        stream.write("Commands:\n");
        for (let [key, [description]] of this.commands.entries()) {
            stream.write("  ");
            const keyStringPadded = key.padEnd(29);
            stream.write(keyStringPadded);
            if (keyStringPadded == key) {
                stream.write("\n");
                stream.write("".padEnd(29));
            } else {
                stream.write(" ");
            }
            stream.write(description);
            stream.write("\n");
        }
    }
}
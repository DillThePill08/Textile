function compile(source) { //work on line 135
    let sourceLines = source.match(/^[^#\n]+/gm) //format into the lines
    
    if (sourceLines) { //if we even have a source code smh
        sourceLines = sourceLines.map(x => x.trim())
    } else {
        return [false, "Compiler error: there is no source code."]
    }
    
    let compiled = {} //compiled functions will go here

    let cmdToReg = cmd => new RegExp("^"+cmd+"(\\*\\d+)?\\s*", "i")
    
    const regexes = [
        /^(\w|-\d)+:\s+{/,           //label: {
        /^}/,                        //}
        /^\[(\w|-)+\](\*\d+)?/,      //[label]
        cmdToReg("pu?sh"),           //push
        cmdToReg("rea?d"),           //read
        cmdToReg("out(put)?"),       //output
        cmdToReg("sub(tract)?"),     //subtract
        cmdToReg("add"),             //add
        cmdToReg("mul(tiply)?"),     //multiply
        cmdToReg("div(ide)?"),       //divide
        cmdToReg("wr(t|ite)"),       //write
        cmdToReg("ran(dom)?"),       //random
        cmdToReg("inp(ut)?"),        //input
        cmdToReg("equ(al)?"),        //equal
        cmdToReg("ju?mp"),           //jump
        cmdToReg("less?"),           //less
        cmdToReg("g(t|reate)r"),     //greater
        cmdToReg("d(ebu|b)g")         //start
    ]

    let func = "" //the current function we are writing code in
    let error = "" //to break out of a loop. stores error message

    const paramRegex = /(?<=(^\w+(\*\d+)\s+)|,)[^,]+/g //this behemoth gets every parameter of 
    
    for (let lineNum = 0; lineNum < sourceLines.length; lineNum++) { //iterate over every line
        const line = sourceLines[lineNum] //the line string
        let match = regexes.map(x => x.test(line)).indexOf(true) //returns which cases matches the line
        
        switch (match) {
            case 0: //label: {
                let label_a = line.match(/(\w|-|\d)+/)[0] //get the label name
                //for the love of god why cant variable names be shared among a switch statement
                if (func) { //if we're already in a function
                    error = "cannot nest functions."
                } else if (compiled[label_a]) { //if the function already exists
                    error = "cannot re-declare a function."
                } else {
                    compiled[label_a] = [] //add the function to the compiled code
                    func = label_a //indicate we are in this function
                }
                break
            case 1: // }
                if (func) { //WHEN THE FUNCTION GOT HENNESSEY!
                    func = "" //exit the function
                } else {
                    error = "there is no function to close." //return an error if we try to close out of nothing
                }
                break
            case 2: //[label]
                let label = line.match(/^\[(\w|-)+/)[0].slice(1) //get the label
                
                if (label == func) { //if we repalace with out own function
                    error = "cannot replace with own function."
                } else if (!compiled[label]) { //if the function isn't real
                    error = "function to replace does not exist."
                } else {
                    let repeat = (line.match(/(?<=\[(\w|-)+\]\*)\d+/) || [1])[0] //get the repetition count
                    if (repeat < 1) { repeat = 1 } //if there is no repeat count then default to 1
                        
                    while (repeat) {
                        compiled[func].push(...compiled[label]) //add to compiled code
                        repeat--
                    }
                }
                break
            default: //any other case, as in the commands
                if (!func) {//out of function
                    error = "cannot execute commands outside of functions."
                    break
                } else if (line == "") { //blank line
                    break
                } else if (match == -1) { //not a real command
                    error = "command does not exist."
                    break
                }
                
                match -= 3 //index the commands at 0 and not 3
                let cmd = [match] //prepare the command we will push
                
                if (match == 0) { //push
                    const params =
                        (line.match(/(?<=\w+(\*\d+)?\s+).+/) || [""])[0] //get params only
                        .match(/(("|').*?\2(\.\w+)?|[^"',\s]+)(?=\s*,|\s*$)/g) || [] //split to array of params
                        //.map(x => x.trim()) we wont need this  but maybe so keep it here

                    
                    parseError = (msg, num) => error = msg+" value could not parse. (parameter "+num+")" 
                    
                    for (let i = 0; i < params.length; i++) { //iterate over parameters
                        switch (params[i][0]) { //test the first charracter of parameter
                            case '$': //hex
                                let decVal16 = parseInt(params[i].slice(1,3), 16)
                                
                                if (!isNaN(decVal16)) { //cmd successfully parsed from hex
                                    cmd.push(decVal16 > 255 ? 255 : decVal16 < 0 ? 0 : decVal16)
                                } else { //oopa
                                    parseError("hex", i+1)
                                }
                                break
                            case '%': //bin
                                let decVal2 = parseInt(params[i].slice(1,9), 2)
                                
                                if (!isNaN(decVal2)) { //cmd successfully parsed from bin
                                    cmd.push(decVal2 > 255 ? 255 : decVal2 < 0 ? 0 : decVal2)
                                } else { //oopa
                                    parseError("binary", i+1)
                                }
                                break
                            case '"': //strings
                            case "'":
                                let p = params[i] //p stands for parameter
                                let str = p.slice(1, p.indexOf(p[0], 2)) //get only the string part
                                
                                if (/\.reverse$/.test(p)) { //if we have reverse method
                                    str = str.split("").reverse().join("")
                                }
                                
                                for (let j = 0; j < str.length; j++) { //iterate over string
                                    cmd.push(str.charCodeAt(j)) //push character
                                }
                                break
                            default: //any other case (should be normal numbers)
                                let num = parseInt(params[i])
                                if (!isNaN(num)) { //if we can make it a real number
                                    cmd.push(num > 255 ? 255 : num < 0 ? 0 : num)
                                } else {
                                    parseError("decimal", i+1)
                                }
                        }
                    }
                }

                if (match == 8 || (match >= 10 && match <= 13)) { //check rand, jump, less, equal, greater
                    let params = (line.match(/(?<=\w+(\*\d+)?\s+).+/) || [""])[0].split(",").map(x => x.trim()) //return cmd params
                    for (let i = 0; i < params.length; i++) { //iterate over parameters
                        cmd.push(params[i]) //add function to command
                    }
                }
                
                //after the command check
                let rep = parseInt((line.match(/(?<=^\w+\*)\d+/) || [1])[0])  //command repetition CMD*2
                do {
                    compiled[func].push(cmd)
                    rep--
                } while (rep) //should work
                
        }
        
        if (error) { //format error message and break the loop on error
            error = "Compiler error: "+error+"\n'"+line+"'\nsomewhere on or after line "+lineNum
            break
        }
    }
    return [
        error ? error : compiled, //return error if there was one or the compiled code if it worked
        !error //success
    ]
}

//-----------------------------------------------------------------

function execute(program, input) {
    if (!program.main && !program.MAIN) { //if there is no main function
        return ["Execution error: no 'main' or 'MAIN' function found.", false]
    } else if (program.main && program.MAIN) { //if there are both mains
        return ["Execution error: found functions 'main' and 'MAIN'.", false]
    }

    input = !input ? "" : input //create an input if there is none
    
    let func = (program.main ? "main" : program.MAIN ? "MAIN" : "") //which function PC is in
    let stack = [] //memory stack
    let mem = [] //memory...memory
    let out = "" //outpit
    let error = ""
    let count = 0

    let pc = 0 //which command in the function we are in
    for (let i = 0; i < program[func].length; i++) { //iterate over main for start
        if (program[func][i][0] == 14) { //if the command is a start
            pc = i + 1
        }
    }
    
    while (program[func][pc] && !error) { //while the command at PC isn't empty and there is no error
        const cmd = program[func][pc]

        let stk1 = stack[stack.length-1] || 0
        let stk2 = stack[stack.length-2] || 0
        let stk3 = stack[stack.length-3] || 0
        
        switch (cmd[0]) { //switch which command this is
            case 0: //push
                if (cmd.length == 1) { //if there are no params, push 0
                    stack.push(0)
                    break
                }
                for (param = 1; param < cmd.length; param++) { //iterate over parameters
                    stack.push(cmd[param]) //push the parameter
                }
                break
            case 1: //read
                stack.pop()
                stack.pop()
                stack.push(mem[stk2 * 256 + stk1] || 0)
                break
            case 2: //output
                out += String.fromCharCode(stk1) //add top stack char code to output
                stack.pop()
                break
            case 3: //subtract
                stack.pop()
                stack.pop()
                stack.push((stk2 - stk1 + 256) % 256) 
                break
            case 4: //add
                stack.pop()
                stack.pop()
                stack.push((stk2 + stk1) % 256)
                break
            case 5: //multiply
                stack.pop()
                stack.pop()
                stack.push((stk2 * stk1) % 256) 
                break
            case 6: //divide
                if (!stk1) { //if the top stack is 0
                    error = "cannot divide by 0."
                    break
                }
                let quot = Math.floor(stk2 / stk1) % 256
                let rem = (stk2 % stk1) % 256
                stack.pop()
                stack.pop()
                stack.push(quot)
                stack.push(rem) //if only
                break
            case 7: //write
                mem[stk2 * 256 + stk1] = stk3
                break
            case 8: //rand
                let plength = cmd.length - 1 //parameter length
                if (plength > 3) plength = 3 //if there is more than 3 parameters
                if (plength == 0) { //if there is no randomize parameters
                    error = "cannot randomize without parameters."
                    break
                }
                let rand = Math.floor(Math.random() * plength) //randomize the value
                if (!program[cmd[rand]]) { //if the randomize value is not in the program
                    error = "function '" + cmd[rand] + "' does not exist."
                } else {
                    func = cmd[rand] //set the function to the randomized function
                    pc = -1 //set the PC to the first command in the function
                }
                break
            case 9: //input
                stack.push((input.charCodeAt(stk2 * 256 + stk1) % 256) || 0) //get input char code
                break
            case 10: //equal
                if (stk1 == stk2) { //if the top stack is the same as the second stack
                    if (!cmd[1]) { //if there is no parameter
                        error = "no function to jump to."
                    } else if (!program[cmd[1]]) { //if the function does not exist
                        error = "function '" + cmd[1] + "' does not exist."
                    } else {
                        func = cmd[1] //set the function to the parameter
                        pc = -1
                    }
                }
                break
            case 11: //jump
                if (!cmd[1]) { //if there is no parameter
                    error = "no function to jump to."
                } else if (!program[cmd[1]]) { //if the function does not exist
                    error = "function '" + cmd[1] + "' does not exist."
                } else {
                    func = cmd[1] //set the function to the parameter
                    pc = -1
                }
                break
            case 12: //less
                if (stk2 < stk1) { //if the top stack is less than the second stack
                    if (!cmd[1]) { //if there is no parameter
                        error = "no function to jump to."
                    } else if (!program[cmd[1]]) { //if the function does not exist
                        error = "function '" + cmd[1] + "' does not exist."
                    } else {
                        func = cmd[1] //set the function to the parameter
                        pc = -1
                    }
                }
                break
            case 13: //greater
                if (stk2 > stk1) { //if the top stack is greater than the second stack
                    if (!cmd[1]) { //if there is no parameter
                        error = "no function to jump to."
                    } else if (!program[cmd[1]]) { //if the function does not exist
                        error = "function '" + cmd[1] + "' does not exist."
                    } else {
                        func = cmd[1] //set the function to the parameter
                        pc = -1
                    }
                }
                break
            case 14: //start / debug
                console.log("Command: "+count+"\nPosition: (function "+func+",index "+pc+")\nStack: ["+stack.join(", ")+"]\nMemory:")
                console.log(mem)
                break
        }
        pc++ //to next instruction
        count++ //increment counter
    }
    return [
        (error ? "Execution Error: "+error+"\n" : "") + "Stopped at (function "+func+",index "+pc+")" + (error ? "" : "\n"+out),
        !error
    ]
}

//------------------------------------------------------------------

function run(program, input) {
    const output = document.getElementById("output")

    const progComp = compile(program) //compile our program

    if (progComp[1]) { //successfully compiled
        const progExec = execute(progComp[0], input)
        output.value = progExec[0]
    } else { //if it threw an error then print it out
        output.value = progComp[0]
    }
}
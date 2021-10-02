const fs = require("fs")
const path = require("path")
const core = require('@actions/core');

const inputDir = core.getInput('inputDir', { required: true })
const outputDir = core.getInput('outputDir', { required: true })

try {
    fs.rmdirSync(outputDir, { recursive: true });
} catch (error) {
    console.log(`Unable to Delete ${outputDir}`)
}

try {
    fs.renameSync(inputDir, outputDir)
} catch (error) {
    console.error(`Unable to Rename ${inputDir} to ${outputDir} due to ${error}`)
    process.exit(1)
}

// GitHub Pages return 404 for file/folder names starting with underscore.

const replacements = []

const findUnderscoreReplacements = async (parent) => {
    // Our starting point
    try {
        // Get the files as an array
        const files = await fs.promises.readdir(parent);

        // Loop them all with the new for...of
        for (const file of files) {
            // Get the full paths
            const fullpath = path.join(parent, file);
            const stat = await fs.promises.stat(fullpath);
            if (stat.isDirectory()) {
                await findUnderscoreReplacements(fullpath)
            }

            if(file.startsWith("_")) {
                replacements.push({
                    find: new RegExp(file, 'g'),
                    replace: file.replace(/^_*(?=(\w))/g, "")
                })
            }
        }
    }
    catch (e) {
        console.error(`Error in Finding Underscore Replacements`)
        console.error(e)
        process.exit(1)
    }
}

const replaceUnderscores = async (parent) => {
    // Our starting point
    try {
        // Get the files as an array
        const files = await fs.promises.readdir(parent);

        // Loop them all with the new for...of
        for (const file of files) {
            // Get the full paths
            const fullpath = path.join(parent, file);
            const stat = await fs.promises.stat(fullpath);

            if (stat.isFile()) {
                let fileContent = await fs.promises.readFile(fullpath, "utf-8")

                replacements.forEach(re => {
                    fileContent = fileContent.replace(re.find, re.replace)
                })

                await fs.promises.writeFile(fullpath, fileContent)
            }
            else if (stat.isDirectory()) {
                await replaceUnderscores(fullpath)
            }

            let newName = file
            replacements.forEach(re => {
                newName = newName.replace(re.find, re.replace)
            })
            await fs.promises.rename(fullpath, path.join(parent, newName))
        }
    }
    catch (e) {
        console.error(`Error in Replacing Underscore`)
        console.error(e)
        process.exit(1)
    }
}

(async function() {
    const parent = path.join(__dirname, outputDir)

    await findUnderscoreReplacements(parent)

    console.log("Replacements:", replacements)

    await replaceUnderscores(parent);

    console.log("next-pages build successful 🤩")
})()
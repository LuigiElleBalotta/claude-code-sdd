export function printJson(value) {
    process.stdout.write(JSON.stringify(value, null, 2) + '\n');
}
export function printLine(line = '') {
    process.stdout.write(line + '\n');
}
export function printError(message) {
    process.stderr.write(message + '\n');
}
//# sourceMappingURL=output.js.map
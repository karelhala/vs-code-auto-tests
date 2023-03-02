// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

function getNames(document, range) {
  const start = range.start;
  const line = document.lineAt(start.line);
  const name = line.text.match(new RegExp(/[\w\d]+(?=\(|\s+=|\s+\()/, 'i'))?.[0];
  if (name) {
    return [name];
  }
  // export { foo, bar, baz } from 'foo';
  return line.text.match(new RegExp(/([\d\w])+(?=\s*,|\s*\})/, 'ig'));
}

function getFileInfo(document) {
  const folder = document.uri.path.replace(new RegExp(/[^\/]*\.*$/, 'i'), '');
  const fileName = document.uri.path.substring(folder.length);
  const extension = fileName.replace(new RegExp(/[^\.]*/, 'i'), '');
  const symbolName = fileName.substring(0, fileName.length - extension.length);
  return {folder, fileName, extension, symbolName};
}

function newInserts(names, symbolName) {
  const newImports = `import { ${names?.join(', ')} } from './${symbolName}';\n`;
  const newDescribes = names?.map((name) => `describe('${name}', () => {
    test('dummy test', () => {
      expect(${name}).toBeDefined();
    });
});`)?.join('\n');
  return [newImports, newDescribes];
}

/**
 * @param context
 */
function activate(context) {

  context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('javascript', new TestGenerator(), {
			providedCodeActionKinds: TestGenerator.providedCodeActionKinds
		}));

  context.subscriptions.push(vscode.commands.registerCommand('auto-tests.generate', async function () {
    const config = vscode.workspace.getConfiguration('autotests');
    const editor = vscode.window.activeTextEditor;
    const names = getNames(editor.document, editor.selection);
    const { symbolName, folder, fileName } = getFileInfo(editor.document);
    const newFileName = config.filename.replace('[filename]', symbolName);
    const filePath = vscode.Uri.file(`${folder}${newFileName}`);
    const workEdits = new vscode.WorkspaceEdit();
    workEdits.createFile(filePath, { ignoreIfExists: true });
    await vscode.workspace.applyEdit(workEdits);
    const doc = await vscode.workspace.openTextDocument(filePath);
    const [newImports, newDescribes] = newInserts(names, symbolName);
    await vscode.window.showTextDocument(doc);
    const newTestFile = vscode.window.activeTextEditor;
    const lastPos = newTestFile.document.positionAt(newTestFile.document.lineCount);
    const firstPos = newTestFile.document.positionAt(1);
    console.log(lastPos, firstPos);
    newTestFile.edit(builder => {
      builder.replace(firstPos, newImports);
      builder.replace(lastPos, newDescribes);
    })
	}));
}

// This method is called when your extension is deactivated
function deactivate() {}

/**
 * Provides code actions for generating fild.
 */
class TestGenerator {
  static providedCodeActionKinds = [
		vscode.CodeActionKind.RefactorMove,
    vscode.CodeActionKind.QuickFix,
    // `${vscode.CodeActionKind.SourceFixAll}.autotests`
	];

  provideCodeActions(document, range, context, token){
    if (!this.isAtStartOfExport(document, range)) {
			return;
		}

    const exportedNames = getNames(document, range);
    const folder = document.uri.path.replace(new RegExp(/[^\/]*\.*$/, 'i'), '');
    const fileName = document.uri.path.substring(folder.length);
    console.log(folder, fileName);
    // if (context.only?.value.startsWith('source.fixAll')) {
    // }
    return [
      this.createCommand(folder, fileName, exportedNames)
    ]
  }

  isAtStartOfExport(document, range) {
    const start = range.start;
		const line = document.lineAt(start.line);
    return line.text.startsWith('export');
  }

  createCommand(folder, fileName, exportedNames) {
    // const extension = fileName.replace(new RegExp(/[^\.]*/, 'i'), '');
    // const symbolName = fileName.substring(0, fileName.length - extension.length);
    const action = new vscode.CodeAction('Generate test file', vscode.CodeActionKind.RefactorMove);
    // action.edit = new vscode.WorkspaceEdit();
    // const config = vscode.workspace.getConfiguration('autotests');
    // const newFileName = config.filename.replace('[filename]', symbolName);
    // const filePath = vscode.Uri.file(`${folder}${newFileName}`);
    // action.edit.createFile(filePath, { ignoreIfExists: true });
    // action.command = { command: 'auto-tests.generate-functions', title: 'Learn more about emojis', tooltip: 'This will open the unicode emoji page.' };
    action.isPreferred = true;
		return action;
  }
}

module.exports = {
  activate,
  deactivate,
  TestGenerator
}

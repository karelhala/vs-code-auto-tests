// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

const COMMAND = 'auto-tests.generate';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param context
 */
function activate(context) {

  context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('javascript', new TestGenerator(), {
			providedCodeActionKinds: TestGenerator.providedCodeActionKinds
		}));

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('auto-tests.generate', function () {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from auto-tests!');
	});

	context.subscriptions.push(disposable);
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
    const folder = document.uri.path.replace(new RegExp(/[^\/]*\.*$/, 'i'), '');
    const fileName = document.uri.path.substring(folder.length);
    console.log(folder, fileName);
    // console.log(document.uri, 'this is document!');
    console.log(range, 'this is range!');
    console.log(context, 'this is context!');
    console.log(token, 'this is token!');
    // if (context.only?.value.startsWith('source.fixAll')) {
    // }
    return [
      this.createCommand(folder, fileName)
    ]
  }

  isAtStartOfExport(document, range) {
    const start = range.start;
		const line = document.lineAt(start.line);
    return line.text.startsWith('export');
  }

  createCommand(folder, fileName) {
    const extension = fileName.replace(new RegExp(/[^\.]*/, 'i'), '');
    const symbolName = fileName.substring(0, fileName.length - extension.length);
    console.log(symbolName, extension, fileName);
    const action = new vscode.CodeAction('Generate test file', vscode.CodeActionKind.RefactorMove);
    action.edit = new vscode.WorkspaceEdit();
    const config = vscode.workspace.getConfiguration('autotests');
    const newFileName = config.filename.replace('[filename]', symbolName);
    const filePath = vscode.Uri.file(`${folder}/${newFileName}`);
    action.edit.createFile(filePath, { ignoreIfExists: true });
    // vscode.window.showInformationMessage('Created a new file: hello/world.md');
    action.isPreferred = true;
		return action;
  }
}

module.exports = {
  activate,
  deactivate,
  TestGenerator
}

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

function getNamedExports(text) {
  const exports = text.match(new RegExp(/^export(?!\s+default)(\s+const)?(\s+async)?(\s+function)?\s+([\w\d_-]+)/, 'igm'));
  return exports?.map((item) => {
    const split = item.split(/\s/);
    return split[split?.length - 1];
  })
}

function hasDefaultExport(text) {
  return text.match(new RegExp(/^export\s+default/, 'igm'))?.length > 0;
}

function getExportList(text) {
  const exports = text.match(new RegExp(/^export\s*{([\s\w\d_,]+)/, 'igm'));
  return exports?.flatMap((item) => {
    const split = item.split('{');
    return split[split?.length - 1].replace(/\s*/ig, '').split(',');
  });
}

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

function newInserts(names, hasDefaultExport, symbolName) {
  const defaultImport = `${symbolName[0].toUpperCase()}${symbolName.substring(1)}`;
  let newImports = '';
  if (names.filter(Boolean).length > 0) {
    newImports = `import { ${names?.join(', ')} } from './${symbolName}';`;
  }
  if (hasDefaultExport) {
    newImports = `${newImports.length > 0 ? `${newImports}\n` : ''}import ${defaultImport} from './${symbolName}';`
  }
  let newDescribes = '';
  if (names.filter(Boolean).length > 0) {
    newDescribes = names?.map((name) => `
describe('${name}', () => {
    test('dummy test', () => {
      expect(${name}).toBeDefined();
    });
});`)?.join('\n');
  }
  if (hasDefaultExport) {
    newDescribes = `${newDescribes.length > 0 ? `${newDescribes}\n` : ''}
describe('${defaultImport}', () => {
  test('dummy test', () => {
    expect(${defaultImport}).toBeDefined();
  });
});`
  }
  return [newImports, `\n${newDescribes}`];
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
    const { symbolName, folder } = getFileInfo(editor.document);
    const newFileName = config.filename.replace('[filename]', symbolName);
    const filePath = vscode.Uri.file(`${folder}${newFileName}`);
    const workEdits = new vscode.WorkspaceEdit();
    workEdits.createFile(filePath, { ignoreIfExists: true });
    await vscode.workspace.applyEdit(workEdits);
    const newTestDoc = await vscode.workspace.openTextDocument(filePath);
    const [newImports, newDescribes] = newInserts(
      [
        ...getNamedExports(editor.document.getText()) || [],
        ...getExportList(editor.document.getText()) || []
      ],
      hasDefaultExport(editor.document.getText()),
      symbolName,
    );
    // open new test doc
    await vscode.window.showTextDocument(newTestDoc);
    const newTestFile = vscode.window.activeTextEditor;
    const lastPos = newTestFile.document.positionAt(newTestFile.document.lineCount);
    const firstPos = newTestFile.document.positionAt(1);
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

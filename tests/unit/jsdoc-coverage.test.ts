import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * JSDoc coverage gate (S-DOC, user mandate 2026-06-12: "thoroughly document
 * all the source code with jsdoc … a gate enforces coverage on exports so the
 * docs cannot silently rot"). Every exported function/class/interface/type/
 * const under src/ must carry a JSDoc doc-comment. Re-export statements
 * (`export { x } from …` / `export type { … }`) carry no declaration of their
 * own, so they are exempt. Uses the TS compiler API for accurate detection
 * (a naive line-scan miscounts single-line and multi-line signatures).
 */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** A declaration is documented if it (or its statement) has a leading JSDoc. */
function hasJsDoc(node: ts.Node): boolean {
  // ts attaches parsed JSDoc to the node; covers /** */ immediately above
  return (ts.getJSDocCommentsAndTags(node) ?? []).some((d) => ts.isJSDoc(d));
}

describe("S-DOC JSDoc coverage", () => {
  it("every exported declaration under src/ carries a JSDoc comment", () => {
    const undocumented: string[] = [];
    for (const file of sourceFiles("src")) {
      const text = readFileSync(file, "utf8");
      const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

      const visit = (node: ts.Node) => {
        const isExported =
          ts.canHaveModifiers(node) &&
          ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
        if (
          isExported &&
          (ts.isFunctionDeclaration(node) ||
            ts.isClassDeclaration(node) ||
            ts.isInterfaceDeclaration(node) ||
            ts.isTypeAliasDeclaration(node) ||
            ts.isEnumDeclaration(node) ||
            ts.isVariableStatement(node))
        ) {
          // a variable statement's JSDoc attaches to the statement node
          const target = ts.isVariableStatement(node) ? node : node;
          if (!hasJsDoc(target)) {
            const name = ts.isVariableStatement(node)
              ? node.declarationList.declarations[0]?.name.getText(sf)
              : (node as { name?: ts.Identifier }).name?.getText(sf);
            const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
            undocumented.push(`${file}:${line} export ${name ?? "<anon>"}`);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sf);
    }

    expect(
      undocumented,
      `undocumented exports (${undocumented.length}):\n${undocumented.join("\n")}`,
    ).toEqual([]);
  });
});

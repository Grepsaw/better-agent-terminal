export interface Workspace {
  id: string;
  name: string;
  folderPath: string;
  createdAt: number;
}

export interface TerminalInstance {
  id: string;
  workspaceId: string;
  type: 'terminal' | 'claude-code';
  title: string;
  pid?: number;
  cwd: string;
  scrollbackBuffer: string[];
}

export interface AppState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  terminals: TerminalInstance[];
  activeTerminalId: string | null;
  focusedTerminalId: string | null;
}

export interface CreatePtyOptions {
  id: string;
  cwd: string;
  type: 'terminal' | 'claude-code';
}

export interface PtyOutput {
  id: string;
  data: string;
}

export interface PtyExit {
  id: string;
  exitCode: number;
}

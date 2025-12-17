export interface Workspace {
  id: string;
  name: string;
  alias?: string;
  role?: string;
  folderPath: string;
  createdAt: number;
}

// Preset roles for quick selection
export const PRESET_ROLES = [
  { id: 'iris', name: 'Iris', color: '#7bbda4' },
  { id: 'irisgo-pm', name: 'IrisGo PM', color: '#8ab3b5' },
  { id: 'lucy', name: 'Lucy', color: '#a89bb9' },
  { id: 'veda', name: 'Veda', color: '#f4bc87' },
  { id: 'exia', name: 'Exia', color: '#cb6077' },
  { id: 'leo', name: 'Leo', color: '#beb55b' },
  { id: 'custom', name: 'Custom', color: '#dfdbc3' },
] as const;

export interface TerminalInstance {
  id: string;
  workspaceId: string;
  type: 'terminal' | 'claude-code';
  title: string;
  alias?: string;
  pid?: number;
  cwd: string;
  scrollbackBuffer: string[];
  lastActivityTime?: number;
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
  shell?: string;
}

export interface PtyOutput {
  id: string;
  data: string;
}

export interface PtyExit {
  id: string;
  exitCode: number;
}

export type ShellType = 'auto' | 'pwsh' | 'powershell' | 'cmd' | 'custom';

export interface AppSettings {
  shell: ShellType;
  customShellPath: string;
  fontSize: number;
  theme: 'dark' | 'light';
}

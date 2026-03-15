import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Minus, Square, X } from "lucide-react";

import { useDevConsole } from "../components/dev-console/dev-console-context";
import { useUser } from "../components/auth/useUser";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import Loader from "../components/ui/loader";
import {
  createPrivilegedUser,
  getPrivilegedUsers,
  type ManagedUserRecord,
  updateManagedUser,
} from "../services/apiDevUsers";

type ConsoleTone =
  | "default"
  | "muted"
  | "success"
  | "error"
  | "warning"
  | "command";

type ConsoleLine = {
  id: number;
  text: string;
  tone: ConsoleTone;
};

type TerminalMode =
  | "command"
  | "select-user"
  | "user-actions"
  | "select-branch"
  | "create-fullname"
  | "create-email"
  | "create-role"
  | "create-branch";

type BranchSelectionMode = "change-branch" | "convert-manager";

type CreateDraft = {
  fullname: string;
  email: string;
  role: "admin" | "manager" | null;
  branch_id: 1 | 2 | null;
  shared_manager: boolean;
};

type IndexedUser = {
  index: number;
  user: ManagedUserRecord;
};

const PROMPT = "PS C:\\WINDOWS\\system32>";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BOOT_LINES = [
  "Windows PowerShell",
  "Copyright (C) Microsoft Corporation. All rights reserved.",
  "",
  "Install the latest PowerShell for new features and improvements!",
  "https://aka.ms/PSWindows",
  "",
];
const EMPTY_CREATE_DRAFT: CreateDraft = {
  fullname: "",
  email: "",
  role: null,
  branch_id: null,
  shared_manager: false,
};
const TONE_CLASS_MAP: Record<ConsoleTone, string> = {
  default: "text-zinc-200",
  muted: "text-zinc-400",
  success: "text-emerald-400",
  error: "text-red-400",
  warning: "text-amber-300",
  command: "text-zinc-100",
};

const toTitleCase = (value: string) =>
  value.length > 0 ? `${value[0].toUpperCase()}${value.slice(1)}` : value;

const getBranchName = (branchId: number | null) => {
  if (branchId === 1) return "taytay";
  if (branchId === 2) return "pasig";
  return "all-branches";
};

const getManagerScopeLabel = (user: ManagedUserRecord) =>
  user.shared_manager ? "shared" : getBranchName(user.branch_id);

const normalizeBranchSelection = (value: string): 1 | 2 | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "taytay") return 1;
  if (normalized === "2" || normalized === "pasig") return 2;
  return null;
};

const sortByIdentity = (left: ManagedUserRecord, right: ManagedUserRecord) => {
  const leftIdentity = (left.fullname || left.email || "").toLowerCase();
  const rightIdentity = (right.fullname || right.email || "").toLowerCase();
  return leftIdentity.localeCompare(rightIdentity);
};

const isCreateMode = (mode: TerminalMode) => mode.startsWith("create-");

export default function DevUsers() {
  const { isLoading: isUserLoading, isDev } = useUser();
  const { isOpen: isConsoleOpen, setOpen: setIsConsoleOpen, closeConsole } =
    useDevConsole();

  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [isBootComplete, setIsBootComplete] = useState(false);
  const [isRunningCommand, setIsRunningCommand] = useState(false);
  const [mode, setMode] = useState<TerminalMode>("command");
  const [promptValue, setPromptValue] = useState("");
  const [createInputValue, setCreateInputValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [selectableUsers, setSelectableUsers] = useState<IndexedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ManagedUserRecord | null>(
    null
  );
  const [branchSelectionMode, setBranchSelectionMode] =
    useState<BranchSelectionMode | null>(null);
  const [createDraft, setCreateDraft] = useState<CreateDraft>(EMPTY_CREATE_DRAFT);

  const nextLineIdRef = useRef(1);
  const commandTokenRef = useRef(0);
  const historyCursorRef = useRef<number | null>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const appendLine = useCallback(
    (text: string, tone: ConsoleTone = "default") => {
      setLines((current) => [
        ...current,
        { id: nextLineIdRef.current++, text, tone },
      ]);
    },
    []
  );

  const appendLines = useCallback(
    (entries: Array<string | { text: string; tone?: ConsoleTone }>) => {
      setLines((current) => {
        const nextEntries = entries.map((entry) => {
          if (typeof entry === "string") {
            return {
              id: nextLineIdRef.current++,
              text: entry,
              tone: "default" as ConsoleTone,
            };
          }

          return {
            id: nextLineIdRef.current++,
            text: entry.text,
            tone: entry.tone || "default",
          };
        });

        return [...current, ...nextEntries];
      });
    },
    []
  );

  const resetConsoleState = useCallback(() => {
    nextLineIdRef.current = 1;
    commandTokenRef.current += 1;
    historyCursorRef.current = null;
    setLines([]);
    setIsBootComplete(false);
    setIsRunningCommand(false);
    setMode("command");
    setPromptValue("");
    setCreateInputValue("");
    setHistory([]);
    setSelectableUsers([]);
    setSelectedUser(null);
    setBranchSelectionMode(null);
    setCreateDraft(EMPTY_CREATE_DRAFT);
  }, []);

  const focusActiveInput = useCallback(() => {
    if (!isConsoleOpen || !isBootComplete) return;

    if (isCreateMode(mode)) {
      createInputRef.current?.focus();
      return;
    }

    promptInputRef.current?.focus();
  }, [isBootComplete, isConsoleOpen, mode]);

  const showUserActions = useCallback(
    (user: ManagedUserRecord) => {
      const actions =
        user.role === "manager"
          ? ["/change-branch", "/demote-technician", "/deactivate", "/back"]
          : ["/convert-manager", "/demote-technician", "/deactivate", "/back"];

      appendLines([
        "",
        `User: ${user.fullname || user.email || "-"}`,
        `Role: ${toTitleCase(user.role)}${user.shared_manager ? " (Shared)" : ""}`,
        `Branch: ${toTitleCase(getManagerScopeLabel(user))}`,
        {
          text: `Status: ${user.deleted ? "Deactivated" : "Active"}`,
          tone: user.deleted ? "warning" : "muted",
        },
        "",
        { text: "Available actions:", tone: "muted" },
        ...actions,
      ]);
    },
    [appendLines]
  );

  const printHelp = useCallback(() => {
    if (mode === "user-actions" && selectedUser) {
      appendLines([
        { text: "Available actions:", tone: "muted" },
        ...(selectedUser.role === "manager"
          ? ["/change-branch", "/demote-technician", "/deactivate", "/back"]
          : ["/convert-manager", "/demote-technician", "/deactivate", "/back"]),
      ]);
      return;
    }
    if (mode === "select-user") {
      appendLines([
        { text: "Selection mode:", tone: "muted" },
        "select user id: <number>",
        "/back",
      ]);
      return;
    }

    if (mode === "select-branch") {
      appendLines([
        { text: "Branch selection:", tone: "muted" },
        "1. taytay",
        "2. pasig",
        "/back",
      ]);
      return;
    }

    if (isCreateMode(mode)) {
      appendLines([
        { text: "Create mode:", tone: "muted" },
        "Enter each field value and press Enter.",
        "/back",
      ]);
      return;
    }

    appendLines([
      { text: "Available commands:", tone: "muted" },
      "/list     - list admin and manager accounts",
      "/create   - create admin, manager, or shared manager account",
      "/help     - show available commands",
    ]);
  }, [appendLines, mode, selectedUser]);

  const runListCommand = useCallback(async () => {
    const token = ++commandTokenRef.current;
    setIsRunningCommand(true);
    setMode("command");
    setSelectedUser(null);
    setBranchSelectionMode(null);
    setSelectableUsers([]);

    appendLine("Loading users...", "muted");

    try {
      const users = await getPrivilegedUsers();
      if (commandTokenRef.current !== token) return;

      const managers = users
        .filter((user) => user.role === "manager")
        .sort(sortByIdentity);
      const admins = users
        .filter((user) => user.role === "admin")
        .sort(sortByIdentity);

      const nextSelectableUsers: IndexedUser[] = [];
      let runningIndex = 1;

      appendLines(["", "[MANAGER]"]);
      if (managers.length === 0) {
        appendLine("none", "muted");
      } else {
        managers.forEach((user) => {
          const status = user.deleted ? " | status: deactivated" : "";
          nextSelectableUsers.push({ index: runningIndex, user });
          appendLine(
            `${runningIndex}. ${user.fullname || user.email || "-"} | branch: ${getManagerScopeLabel(user)}${status}`
          );
          runningIndex += 1;
        });
      }

      appendLines(["", "[ADMIN]"]);
      if (admins.length === 0) {
        appendLine("none", "muted");
      } else {
        admins.forEach((user) => {
          const status = user.deleted ? " | status: deactivated" : "";
          nextSelectableUsers.push({ index: runningIndex, user });
          appendLine(`${runningIndex}. ${user.fullname || user.email || "-"}${status}`);
          runningIndex += 1;
        });
      }

      setSelectableUsers(nextSelectableUsers);
      if (nextSelectableUsers.length > 0) {
        appendLines(["", { text: "select user id:", tone: "muted" }]);
        setMode("select-user");
      } else {
        appendLine("No admin or manager accounts found.", "warning");
        setMode("command");
      }
    } catch (error) {
      if (commandTokenRef.current !== token) return;

      const message =
        error instanceof Error ? error.message : "Failed to load users.";
      appendLine(`✖ ${message}`, "error");
      setMode("command");
    } finally {
      if (commandTokenRef.current === token) {
        setIsRunningCommand(false);
      }
    }
  }, [appendLine, appendLines]);

  const runUpdateCommand = useCallback(
    async (
      payload: Parameters<typeof updateManagedUser>[0],
      successMessage: string
    ) => {
      const token = ++commandTokenRef.current;
      setIsRunningCommand(true);
      appendLine("Applying update...", "muted");

      try {
        const result = await updateManagedUser(payload);
        if (commandTokenRef.current !== token) return;

        const updatedUser = result.user;
        appendLine(`✔ ${successMessage}`, "success");

        if (updatedUser.role === "technician") {
          appendLines([
            {
              text: "⚠ User is now technician and no longer in privileged list.",
              tone: "warning",
            },
            { text: "Run /list to refresh user records.", tone: "muted" },
          ]);
          setSelectedUser(null);
          setSelectableUsers([]);
          setMode("command");
          setBranchSelectionMode(null);
          return;
        }

        setSelectedUser(updatedUser);
        setMode("user-actions");
        setBranchSelectionMode(null);
        showUserActions(updatedUser);
      } catch (error) {
        if (commandTokenRef.current !== token) return;

        const message =
          error instanceof Error ? error.message : "Failed to update user.";
        appendLine(`✖ ${message}`, "error");
      } finally {
        if (commandTokenRef.current === token) {
          setIsRunningCommand(false);
        }
      }
    },
    [appendLine, appendLines, showUserActions]
  );

  const submitCreateDraft = useCallback(
    async (draft: CreateDraft) => {
      if (!draft.role) {
        appendLine("✖ role must be admin, manager, or shared-manager", "error");
        setMode("command");
        return;
      }

      if (draft.role === "manager" && !draft.shared_manager && !draft.branch_id) {
        appendLine("✖ branch must be taytay or pasig", "error");
        setMode("create-branch");
        return;
      }

      const token = ++commandTokenRef.current;
      setIsRunningCommand(true);
      appendLine("Creating user...", "muted");

      try {
        const result = await createPrivilegedUser({
          fullname: draft.fullname.trim(),
          email: draft.email.trim().toLowerCase(),
          role: draft.role,
          branch_id:
            draft.role === "manager" && !draft.shared_manager
              ? draft.branch_id
              : null,
          shared_manager: draft.role === "manager" && draft.shared_manager,
        });
        if (commandTokenRef.current !== token) return;

        appendLine("✔ user created successfully", "success");
        if (result.role === "manager" && result.shared_manager) {
          appendLine("mode : shared manager", "muted");
        }
        if (result.invite_sent === false) {
          appendLine(
            `✖ ${result.invite_error || "invite email failed"}`,
            "warning"
          );
        } else {
          appendLine("invite email sent", "success");
        }
      } catch (error) {
        if (commandTokenRef.current !== token) return;

        const message =
          error instanceof Error ? error.message : "Failed to create user.";
        appendLine(`✖ ${message}`, "error");
      } finally {
        if (commandTokenRef.current === token) {
          setCreateDraft(EMPTY_CREATE_DRAFT);
          setCreateInputValue("");
          setSelectedUser(null);
          setBranchSelectionMode(null);
          setMode("command");
          setIsRunningCommand(false);
        }
      }
    },
    [appendLine]
  );

  const startCreateFlow = useCallback(() => {
    setCreateDraft(EMPTY_CREATE_DRAFT);
    setCreateInputValue("");
    setMode("create-fullname");
    setSelectedUser(null);
    setBranchSelectionMode(null);
    appendLines(["", "Create New User", "---------------"]);
  }, [appendLines]);

  const cancelCreateFlow = useCallback(() => {
    setCreateDraft(EMPTY_CREATE_DRAFT);
    setCreateInputValue("");
    setMode("command");
    appendLine("⚠ create workflow cancelled", "warning");
  }, [appendLine]);

  const abortCurrentCommand = useCallback(() => {
    if (!isBootComplete) return;

    const hasAbortableWork =
      isRunningCommand ||
      mode !== "command" ||
      promptValue.trim().length > 0 ||
      createInputValue.trim().length > 0;

    if (!hasAbortableWork) return;

    commandTokenRef.current += 1;
    historyCursorRef.current = null;
    setIsRunningCommand(false);
    setPromptValue("");
    setCreateInputValue("");
    setMode("command");
    setCreateDraft(EMPTY_CREATE_DRAFT);
    setSelectedUser(null);
    setSelectableUsers([]);
    setBranchSelectionMode(null);
    appendLine("^C", "warning");
  }, [
    appendLine,
    createInputValue,
    isBootComplete,
    isRunningCommand,
    mode,
    promptValue,
  ]);

  useEffect(() => {
    if (!isConsoleOpen) return;

    setIsMinimized(false);
    setIsMaximized(false);
    resetConsoleState();

    let cancelled = false;
    let lineIndex = 0;

    const printBootLine = () => {
      if (cancelled) return;

      if (lineIndex >= BOOT_LINES.length) {
        setIsBootComplete(true);
        return;
      }

      appendLine(BOOT_LINES[lineIndex], "muted");
      lineIndex += 1;
      window.setTimeout(printBootLine, 100);
    };

    printBootLine();

    return () => {
      cancelled = true;
    };
  }, [appendLine, isConsoleOpen, resetConsoleState]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [
    lines,
    isBootComplete,
    isRunningCommand,
    mode,
    promptValue,
    createInputValue,
    isConsoleOpen,
  ]);

  useEffect(() => {
    focusActiveInput();
  }, [focusActiveInput, mode]);

  const availableCommands = useMemo(() => {
    const commands = ["/help", "/list", "/create"];

    if (mode !== "command") {
      commands.push("/back");
    }

    if (mode === "user-actions" && selectedUser) {
      if (selectedUser.role === "manager") {
        commands.push("/change-branch", "/demote-technician", "/deactivate");
      } else if (selectedUser.role === "admin") {
        commands.push("/convert-manager", "/demote-technician", "/deactivate");
      }
    }

    return Array.from(new Set(commands));
  }, [mode, selectedUser]);

  const autocompleteSuggestion = useMemo(() => {
    const normalized = promptValue.trim().toLowerCase();
    if (!normalized.startsWith("/")) return null;

    return (
      availableCommands.find(
        (command) => command.startsWith(normalized) && command !== normalized
      ) || null
    );
  }, [availableCommands, promptValue]);

  const processPromptInput = useCallback(
    async (rawInput: string) => {
      const submitted = rawInput.trim();
      const normalized = submitted.toLowerCase();

      if (!submitted) return;

      if (normalized === "/help") {
        printHelp();
        return;
      }

      if (normalized === "/list") {
        await runListCommand();
        return;
      }

      if (normalized === "/create") {
        startCreateFlow();
        return;
      }

      if (normalized === "/back") {
        if (mode === "command") {
          appendLine("Already at root prompt.", "muted");
          return;
        }

        if (mode === "select-user") {
          setMode("command");
          setSelectedUser(null);
          setBranchSelectionMode(null);
          appendLine("Returned to command prompt.", "muted");
          return;
        }

        if (mode === "user-actions") {
          setSelectedUser(null);
          setBranchSelectionMode(null);
          if (selectableUsers.length > 0) {
            setMode("select-user");
            appendLine("select user id:", "muted");
          } else {
            setMode("command");
          }
          return;
        }

        if (mode === "select-branch" && selectedUser) {
          setMode("user-actions");
          setBranchSelectionMode(null);
          showUserActions(selectedUser);
          return;
        }
      }

      if (mode === "select-user") {
        const match = submitted.match(/^(?:select\s+user\s+id\s*:?\s*)?(\d+)$/i);
        if (!match) {
          appendLine("✖ invalid input. Enter a user id from /list.", "error");
          return;
        }

        const selectedIndex = Number.parseInt(match[1], 10);
        const picked = selectableUsers.find((entry) => entry.index === selectedIndex);
        if (!picked) {
          appendLine("✖ user id not found in current list.", "error");
          return;
        }

        setSelectedUser(picked.user);
        setMode("user-actions");
        showUserActions(picked.user);
        return;
      }

      if (mode === "user-actions") {
        if (!selectedUser) {
          appendLine("✖ no selected user. Run /list first.", "error");
          setMode("command");
          return;
        }

        if (selectedUser.role === "manager") {
          if (normalized === "/change-branch") {
            setBranchSelectionMode("change-branch");
            setMode("select-branch");
            appendLines([
              "",
              { text: "Select branch:", tone: "muted" },
              "1. taytay",
              "2. pasig",
            ]);
            return;
          }

          if (normalized === "/demote-technician") {
            await runUpdateCommand(
              {
                user_id: selectedUser.id,
                role: "technician",
                branch_id: selectedUser.branch_id,
              },
              "User demoted to technician."
            );
            return;
          }

          if (normalized === "/deactivate") {
            if (selectedUser.deleted) {
              appendLine("⚠ user is already deactivated.", "warning");
              return;
            }
            await runUpdateCommand(
              { user_id: selectedUser.id, deleted: true },
              "User deactivated."
            );
            return;
          }
        }

        if (selectedUser.role === "admin") {
          if (normalized === "/convert-manager") {
            setBranchSelectionMode("convert-manager");
            setMode("select-branch");
            appendLines([
              "",
              { text: "Select branch:", tone: "muted" },
              "1. taytay",
              "2. pasig",
            ]);
            return;
          }

          if (normalized === "/demote-technician") {
            await runUpdateCommand(
              {
                user_id: selectedUser.id,
                role: "technician",
                branch_id: selectedUser.branch_id,
              },
              "User demoted to technician."
            );
            return;
          }

          if (normalized === "/deactivate") {
            if (selectedUser.deleted) {
              appendLine("⚠ user is already deactivated.", "warning");
              return;
            }
            await runUpdateCommand(
              { user_id: selectedUser.id, deleted: true },
              "User deactivated."
            );
            return;
          }
        }

        appendLine("✖ unknown action for selected user.", "error");
        return;
      }

      if (mode === "select-branch") {
        if (!selectedUser || !branchSelectionMode) {
          setMode("command");
          appendLine("✖ branch selection context expired. Run /list again.", "error");
          return;
        }

        const branchId = normalizeBranchSelection(submitted);
        if (!branchId) {
          appendLine("✖ invalid branch. Use 1 (taytay) or 2 (pasig).", "error");
          return;
        }

        if (branchSelectionMode === "change-branch") {
          const wasSharedManager = selectedUser.shared_manager === true;
          await runUpdateCommand(
            {
              user_id: selectedUser.id,
              branch_id: branchId,
              shared_manager: false,
            },
            wasSharedManager
              ? `Shared manager converted to branch manager (${toTitleCase(
                  getBranchName(branchId)
                )}).`
              : `Manager branch changed to ${toTitleCase(
                  getBranchName(branchId)
                )}.`
          );
          return;
        }

        await runUpdateCommand(
          {
            user_id: selectedUser.id,
            role: "manager",
            branch_id: branchId,
            shared_manager: false,
          },
          `Admin converted to manager (${toTitleCase(getBranchName(branchId))}).`
        );
        return;
      }

      appendLine("✖ unknown command. Type /help.", "error");
    },
    [
      appendLine,
      appendLines,
      branchSelectionMode,
      mode,
      printHelp,
      runListCommand,
      runUpdateCommand,
      selectableUsers,
      selectedUser,
      showUserActions,
      startCreateFlow,
    ]
  );

  const submitPromptInput = useCallback(async () => {
    const submitted = promptValue.trim();

    if (!submitted || isRunningCommand || !isBootComplete || isCreateMode(mode)) {
      return;
    }

    appendLine(`${PROMPT} ${submitted}`, "command");
    setPromptValue("");
    historyCursorRef.current = null;

    if (submitted.startsWith("/")) {
      setHistory((current) => {
        if (current[current.length - 1] === submitted) return current;
        return [...current, submitted];
      });
    }

    await processPromptInput(submitted);
  }, [
    appendLine,
    isBootComplete,
    isRunningCommand,
    mode,
    processPromptInput,
    promptValue,
  ]);

  const onPromptKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
      event.preventDefault();
      abortCurrentCommand();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      void submitPromptInput();
      return;
    }

    if (event.key === "Tab" && autocompleteSuggestion) {
      event.preventDefault();
      setPromptValue(autocompleteSuggestion);
      historyCursorRef.current = null;
      return;
    }

    if (event.key === "ArrowUp" && history.length > 0) {
      event.preventDefault();
      const nextIndex =
        historyCursorRef.current === null
          ? history.length - 1
          : Math.max(0, historyCursorRef.current - 1);
      historyCursorRef.current = nextIndex;
      setPromptValue(history[nextIndex]);
      return;
    }

    if (event.key === "ArrowDown" && history.length > 0) {
      event.preventDefault();
      if (historyCursorRef.current === null) return;

      const nextIndex = historyCursorRef.current + 1;
      if (nextIndex >= history.length) {
        historyCursorRef.current = null;
        setPromptValue("");
        return;
      }

      historyCursorRef.current = nextIndex;
      setPromptValue(history[nextIndex]);
    }
  };

  const submitCreateInput = useCallback(async () => {
    if (!isCreateMode(mode) || isRunningCommand || !isBootComplete) return;

    const submitted = createInputValue.trim();
    if (submitted.toLowerCase() === "/back") {
      cancelCreateFlow();
      return;
    }

    if (mode === "create-fullname") {
      if (!submitted) {
        appendLine("✖ fullname cannot be empty", "error");
        return;
      }

      setCreateDraft((current) => ({ ...current, fullname: submitted }));
      appendLine(`fullname : ${submitted}`);
      setCreateInputValue("");
      setMode("create-email");
      return;
    }

    if (mode === "create-email") {
      if (!submitted) {
        appendLine("✖ email cannot be empty", "error");
        return;
      }

      const normalizedEmail = submitted.toLowerCase();
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        appendLine("✖ invalid email format", "error");
        return;
      }

      setCreateDraft((current) => ({ ...current, email: normalizedEmail }));
      appendLine(`email : ${normalizedEmail}`);
      setCreateInputValue("");
      setMode("create-role");
      return;
    }

    if (mode === "create-role") {
      if (!submitted) {
        appendLine("✖ role must be admin, manager, or shared-manager", "error");
        return;
      }

      const normalizedRole = submitted.toLowerCase();
      const isSharedManagerRole =
        normalizedRole === "shared-manager" ||
        normalizedRole === "shared_manager" ||
        normalizedRole === "shared manager" ||
        normalizedRole === "shared";

      if (
        normalizedRole !== "admin" &&
        normalizedRole !== "manager" &&
        !isSharedManagerRole
      ) {
        appendLine("✖ role must be admin, manager, or shared-manager", "error");
        return;
      }

      if (isSharedManagerRole) {
        const nextDraft: CreateDraft = {
          ...createDraft,
          role: "manager",
          branch_id: null,
          shared_manager: true,
        };

        setCreateDraft(nextDraft);
        appendLine("role : manager (shared)");
        setCreateInputValue("");
        await submitCreateDraft(nextDraft);
        return;
      }

      if (normalizedRole === "manager") {
        setCreateDraft((current) => ({
          ...current,
          role: "manager",
          branch_id: null,
          shared_manager: false,
        }));
        appendLine("role : manager");
        setCreateInputValue("");
        setMode("create-branch");
        return;
      }

      const nextDraft: CreateDraft = {
        ...createDraft,
        role: "admin",
        branch_id: null,
        shared_manager: false,
      };

      setCreateDraft(nextDraft);
      appendLine("role : admin");
      setCreateInputValue("");
      await submitCreateDraft(nextDraft);
      return;
    }

    if (mode === "create-branch") {
      if (!submitted) {
        appendLine("✖ branch must be taytay or pasig", "error");
        return;
      }

      const branchId = normalizeBranchSelection(submitted);
      if (!branchId) {
        appendLine("✖ branch must be taytay or pasig", "error");
        return;
      }

      const nextDraft: CreateDraft = {
        ...createDraft,
        role: "manager",
        branch_id: branchId,
        shared_manager: false,
      };

      setCreateDraft(nextDraft);
      appendLine(`branch : ${getBranchName(branchId)}`);
      setCreateInputValue("");
      await submitCreateDraft(nextDraft);
    }
  }, [
    appendLine,
    cancelCreateFlow,
    createDraft,
    createInputValue,
    isBootComplete,
    isRunningCommand,
    mode,
    submitCreateDraft,
  ]);

  const onCreateInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
      event.preventDefault();
      abortCurrentCommand();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      void submitCreateInput();
    }
  };

  const isCreateActive = isCreateMode(mode);
  const createPromptLabel = useMemo(() => {
    if (mode === "create-fullname") return "fullname :";
    if (mode === "create-email") return "email :";
    if (mode === "create-role")
      return "role (admin / manager / shared-manager) :";
    return "branch (taytay / pasig) :";
  }, [mode]);

  const modalSizeClass = isMaximized
    ? "w-[96vw] max-w-none h-[92vh]"
    : isMinimized
      ? "w-[94vw] max-w-[860px] h-10"
      : "w-[94vw] max-w-[860px] h-[540px] max-h-[82vh]";

  if (isUserLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!isDev) return null;

  return (
    <Dialog open={isConsoleOpen} onOpenChange={setIsConsoleOpen}>
      <DialogContent
        className={`${modalSizeClass} p-0 border-none bg-transparent shadow-none [&>button]:hidden`}
      >
        <DialogTitle className="sr-only">Windows PowerShell Dev Console</DialogTitle>

        <div className="h-full w-full overflow-hidden border border-zinc-700 rounded-sm shadow-2xl bg-[#0c0c0c] text-zinc-100 font-mono">
          <div className="h-10 border-b border-zinc-700 bg-[#1f1f1f] px-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-[#0078d4]" />
              <span className="text-zinc-200">Windows PowerShell</span>
            </div>

            <div className="flex items-center -mr-2">
              <button
                type="button"
                aria-label="Minimize"
                className="h-8 w-10 inline-flex items-center justify-center text-zinc-300 hover:bg-zinc-700 transition-colors"
                onClick={() => {
                  setIsMinimized((current) => !current);
                  setIsMaximized(false);
                }}
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Maximize"
                className="h-8 w-10 inline-flex items-center justify-center text-zinc-300 hover:bg-zinc-700 transition-colors"
                onClick={() => {
                  setIsMaximized((current) => !current);
                  setIsMinimized(false);
                }}
              >
                <Square className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Close console"
                onClick={closeConsole}
                className="h-8 w-10 inline-flex items-center justify-center text-zinc-300 hover:bg-red-600 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div
              className="h-[calc(100%-2.5rem)] overflow-y-auto px-4 py-3 text-sm leading-6"
              onClick={focusActiveInput}
            >
              {lines.map((line) => (
                <div
                  key={line.id}
                  className={`${TONE_CLASS_MAP[line.tone]} whitespace-pre-wrap break-words`}
                >
                  {line.text || "\u00a0"}
                </div>
              ))}

              {isBootComplete && !isCreateActive && (
                <>
                  <div className="flex items-center gap-2 text-zinc-200">
                    <span className="shrink-0">{PROMPT}</span>
                    <input
                      ref={promptInputRef}
                      value={promptValue}
                      onChange={(event) => {
                        setPromptValue(event.target.value);
                        historyCursorRef.current = null;
                      }}
                      onKeyDown={onPromptKeyDown}
                      readOnly={isRunningCommand}
                      spellCheck={false}
                      autoComplete="off"
                      className="flex-1 bg-transparent border-none outline-none text-zinc-100 caret-zinc-100"
                    />
                  </div>
                  {autocompleteSuggestion && (
                    <div className="text-xs text-zinc-500">
                      suggestion: {autocompleteSuggestion}
                    </div>
                  )}
                </>
              )}

              {isBootComplete && isCreateActive && (
                <div className="flex items-center gap-2 text-zinc-200">
                  <span className="shrink-0 text-zinc-400">{createPromptLabel}</span>
                  <input
                    ref={createInputRef}
                    value={createInputValue}
                    onChange={(event) => setCreateInputValue(event.target.value)}
                    onKeyDown={onCreateInputKeyDown}
                    readOnly={isRunningCommand}
                    spellCheck={false}
                    autoComplete="off"
                    className="flex-1 bg-transparent border-none outline-none text-zinc-100 caret-zinc-100"
                  />
                </div>
              )}

              {isRunningCommand && (
                <div className="text-xs text-zinc-500">running...</div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

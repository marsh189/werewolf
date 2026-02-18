type CreateLobbyModalProps = {
  isOpen: boolean;
  newLobbyName: string;
  creatingLobby: boolean;
  onNameChange: (value: string) => void;
  onCreate: () => void;
  onClose: () => void;
};

export default function CreateLobbyModal({
  isOpen,
  newLobbyName,
  creatingLobby,
  onNameChange,
  onCreate,
  onClose,
}: CreateLobbyModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-lobby-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-700/70 bg-slate-900/95 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 id="create-lobby-title" className="game-table-head">
            Create Lobby
          </h2>
        </div>

        <div className="mt-4">
          <label className="sr-only" htmlFor="new-lobby-name">
            Lobby Name
          </label>
          <input
            id="new-lobby-name"
            value={newLobbyName}
            onChange={(e) => onNameChange(e.target.value)}
            className="game-input py-2"
            placeholder="Enter lobby name"
            required
            autoFocus
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            className="game-button-secondary py-2 px-4 md:w-auto"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="game-button-primary py-2 px-4 md:w-auto"
            onClick={onCreate}
            disabled={creatingLobby || !newLobbyName.trim()}
          >
            {creatingLobby ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

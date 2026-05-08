import { create } from 'zustand';
import { MAX_OBJECT_TEMPLATES } from '../utils/constants';

const DEFAULT_MODEL = 'flux';

interface SelectionState {
  selectedMainTemplateId: string | null;
  selectedObjectTemplateIds: string[];
  selectedModel: string;
  setMainTemplate: (id: string) => void;
  toggleObjectTemplate: (id: string) => void;
  setModel: (model: string) => void;
  clearSelections: () => void;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedMainTemplateId: null,
  selectedObjectTemplateIds: [],
  selectedModel: DEFAULT_MODEL,

  setMainTemplate: (id) => set({ selectedMainTemplateId: id }),

  toggleObjectTemplate: (id) => {
    const current = get().selectedObjectTemplateIds;
    if (current.includes(id)) {
      set({ selectedObjectTemplateIds: current.filter((x) => x !== id) });
    } else if (current.length < MAX_OBJECT_TEMPLATES) {
      set({ selectedObjectTemplateIds: [...current, id] });
    }
    // Silently ignore if already at max — UI badge should reflect this
  },

  setModel: (model) => set({ selectedModel: model }),

  clearSelections: () =>
    set({
      selectedMainTemplateId: null,
      selectedObjectTemplateIds: [],
      selectedModel: DEFAULT_MODEL,
    }),
}));

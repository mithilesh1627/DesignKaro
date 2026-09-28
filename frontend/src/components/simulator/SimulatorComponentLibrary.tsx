import React from "react";
import { Search, X, Plus } from "lucide-react";
import { CATEGORY_LABELS, ComponentDefinition } from "./simulatorConstants";

export interface SimulatorComponentLibraryProps {
  isMobileComponentLibraryOpen: boolean;
  setIsMobileComponentLibraryOpen: (open: boolean) => void;
  searchFilter: string;
  setSearchFilter: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  filteredComponents: ComponentDefinition[];
  onDragStart: (e: React.DragEvent, type: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  handleAddComponent: (type: string) => void;
}

export function SimulatorComponentLibrary({
  isMobileComponentLibraryOpen,
  setIsMobileComponentLibraryOpen,
  searchFilter,
  setSearchFilter,
  selectedCategory,
  setSelectedCategory,
  filteredComponents,
  onDragStart,
  onDragEnd,
  handleAddComponent,
}: SimulatorComponentLibraryProps) {
  return (
    <>
      {/* Mobile Backdrop for Component Library Drawer */}
      {isMobileComponentLibraryOpen && (
        <div
          onClick={() => setIsMobileComponentLibraryOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* LEFT PANE: COMPONENT LIBRARY */}
      <aside
        className={`${
          isMobileComponentLibraryOpen
            ? "fixed inset-y-0 left-0 z-40 w-72 sm:w-80 shadow-2xl flex"
            : "hidden md:flex"
        } md:relative md:w-64 lg:w-72 border-r border-zinc-800 bg-zinc-950 flex-col shrink-0 transition-all duration-200`}
      >
        <div className="p-3 border-b border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
            <span>COMPONENTS</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">
                {filteredComponents.length} Blocks
              </span>
              <button
                onClick={() => setIsMobileComponentLibraryOpen(false)}
                aria-label="Close component library drawer"
                className="md:hidden p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
                title="Close Component Library"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Component Search */}
          <div className="relative">
            <label htmlFor="sim-component-search-input" className="sr-only">
              Search components
            </label>
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
            <input
              id="sim-component-search-input"
              type="text"
              placeholder="Search components..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-750 focus:border-zinc-600 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
            {CATEGORY_LABELS.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap transition ${
                  selectedCategory === cat.key
                    ? "bg-zinc-800 text-zinc-100 font-medium border border-zinc-700"
                    : "text-zinc-500 hover:text-zinc-300 bg-zinc-900/60"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Draggable Component Cards */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
          {filteredComponents.map((comp) => {
            const CompIcon = comp.icon;
            return (
              <div
                key={comp.type}
                draggable
                onDragStart={(e) => onDragStart(e, comp.type)}
                onDragEnd={onDragEnd}
                onClick={() => {
                  handleAddComponent(comp.type);
                  if (typeof window !== "undefined" && window.innerWidth < 768) {
                    setIsMobileComponentLibraryOpen(false);
                  }
                }}
                className="group p-2 rounded-md border border-zinc-800/80 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700 transition-colors cursor-grab active:cursor-grabbing flex items-center justify-between select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`p-1.5 rounded border ${comp.borderClass} ${comp.bgClass} ${comp.textClass} shrink-0`}
                  >
                    <CompIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors truncate">
                        {comp.name}
                      </span>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {comp.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                      {comp.description}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddComponent(comp.type);
                    if (typeof window !== "undefined" && window.innerWidth < 768) {
                      setIsMobileComponentLibraryOpen(false);
                    }
                  }}
                  title="Click to place on canvas"
                  className="p-1 rounded opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition shrink-0 ml-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="p-2.5 border-t border-zinc-800 bg-zinc-950 text-[10px] text-zinc-500 text-center">
          <span className="hidden md:inline">Drag onto canvas or click (+) to place</span>
          <span className="md:hidden">Tap any block or (+) to place onto canvas</span>
        </div>
      </aside>
    </>
  );
}

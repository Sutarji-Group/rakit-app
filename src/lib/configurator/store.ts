'use client';

import { create } from 'zustand';
import {
  buildDependencyGraph,
  collectRecommendations,
  resolveAdd,
  resolveRemove,
  validateMinimumViable,
  type CascadeImpact,
  type DependencyGraph,
  type MinimumViabilityResult,
  type Recommendation,
} from './dependency';
import {
  computePrice,
  type PriceBreakdown,
  type PriceInputAddOn,
  type PriceInputCustom,
  type PriceInputFeature,
} from '@/lib/pricing';
import type {
  ConfiguratorPayload,
  CustomRequestDTO,
} from '@/lib/services/configuration';
import type { FeatureDTO } from '@/lib/services/catalog';
import {
  COUNTED_CUSTOM_STATUSES,
  type ProjectDeployment,
  type ProjectPlatform,
  type UserTier,
} from '@/lib/domain/enums';
import { debounce } from '@/lib/utils';
import { track } from '@/lib/analytics/track';

/**
 * Pemberitahuan singkat atas tindakan otomatis mesin dependensi.
 *
 * PRD C3.1 dan C3.2 mensyaratkan setiap penambahan atau pelepasan otomatis
 * dijelaskan, bukan terjadi diam-diam. Keranjang yang berubah sendiri tanpa
 * penjelasan adalah pengalaman yang merusak kepercayaan.
 */
export interface Notice {
  id: string;
  kind: 'ADDED' | 'REMOVED' | 'BLOCKED' | 'INFO';
  message: string;
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface PendingCascade {
  featureId: string;
  featureName: string;
  cascade: CascadeImpact[];
}

interface ConfiguratorState {
  // -- Data statis --------------------------------------------------------
  payload: ConfiguratorPayload;
  graph: DependencyGraph;
  featureIndex: Map<string, FeatureDTO>;
  groupNameById: Map<string, string>;

  // -- Pilihan pengguna ---------------------------------------------------
  selected: Set<string>;
  selectedAddOns: Set<string>;
  platform: ProjectPlatform;
  deployment: ProjectDeployment;
  userTier: UserTier;
  customRequests: CustomRequestDTO[];

  // -- Nilai turunan ------------------------------------------------------
  breakdown: PriceBreakdown;
  minViable: MinimumViabilityResult;
  recommendations: Recommendation[];

  // -- Keadaan antarmuka --------------------------------------------------
  activeGroupId: string | null;
  search: string;
  saveState: SaveState;
  saveError: string | null;
  notices: Notice[];
  pendingCascade: PendingCascade | null;
  startedAt: number;
  isEditable: boolean;

  // -- Tindakan -----------------------------------------------------------
  toggleFeature: (featureId: string) => void;
  confirmCascade: () => void;
  cancelCascade: () => void;
  applyPresetLocal: (presetId: string) => void;
  setOption: (
    option: Partial<{
      platform: ProjectPlatform;
      deployment: ProjectDeployment;
      userTier: UserTier;
    }>,
  ) => void;
  toggleAddOn: (addOnId: string, optionGroup?: string | null) => void;
  setActiveGroup: (groupId: string | null) => void;
  setSearch: (value: string) => void;
  dismissNotice: (id: string) => void;
  registerCustomRequest: (request: CustomRequestDTO) => void;
  removeCustomRequest: (requestId: string) => void;
  saveNow: () => void;
  saveOptionsNow: () => void;
}

// ---------------------------------------------------------------------------
// Penyusun masukan mesin harga
// ---------------------------------------------------------------------------

function buildInputs(state: {
  payload: ConfiguratorPayload;
  featureIndex: Map<string, FeatureDTO>;
  groupNameById: Map<string, string>;
  selected: Set<string>;
  selectedAddOns: Set<string>;
  customRequests: CustomRequestDTO[];
}): {
  features: PriceInputFeature[];
  customRequests: PriceInputCustom[];
  addOns: PriceInputAddOn[];
} {
  const features: PriceInputFeature[] = [];
  for (const id of state.selected) {
    const feature = state.featureIndex.get(id);
    if (!feature) continue;
    features.push({
      id: feature.id,
      name: feature.name,
      type: feature.type,
      manDayMin: feature.manDayMin,
      manDayMax: feature.manDayMax,
      effortRatioOverride: feature.effortRatioOverride,
      groupName: state.groupNameById.get(feature.groupId),
    });
  }

  const customRequests: PriceInputCustom[] = state.customRequests.map((request) => ({
    id: request.id,
    name: request.name,
    isEstimated:
      COUNTED_CUSTOM_STATUSES.includes(request.status) &&
      request.manDayMin != null &&
      request.manDayMax != null,
    manDayMin: request.manDayMin,
    manDayMax: request.manDayMax,
  }));

  const addOns: PriceInputAddOn[] = state.payload.addOns
    .filter((addOn) => state.selectedAddOns.has(addOn.id))
    .map((addOn) => ({
      id: addOn.id,
      name: addOn.name,
      kind: addOn.kind as PriceInputAddOn['kind'],
      priceMin: addOn.priceMin,
      priceMax: addOn.priceMax,
      manDayMin: addOn.manDayMin,
      manDayMax: addOn.manDayMax,
      isRecurring: addOn.isRecurring,
    }));

  return { features, customRequests, addOns };
}

let noticeCounter = 0;
function makeNotice(kind: Notice['kind'], message: string): Notice {
  noticeCounter += 1;
  return { id: `n-${noticeCounter}`, kind, message };
}

// ---------------------------------------------------------------------------
// Penyimpanan ke server
// ---------------------------------------------------------------------------

/**
 * Konfigurasi tersimpan otomatis setiap perubahan (kriteria penerimaan modul C:
 * "menutup tab tidak menghilangkan progres"). Penyimpanan ditunda sesaat agar
 * mencentang beberapa fitur berturut-turut tidak memicu satu permintaan per klik.
 */
const SAVE_DEBOUNCE_MS = 700;

export const useConfigurator = create<ConfiguratorState>((set, get) => {
  const persistSelection = debounce(async () => {
    const { payload, selected, isEditable } = get();
    if (!isEditable) return;
    set({ saveState: 'saving', saveError: null });
    try {
      const response = await fetch(`/api/configurations/${payload.configuration.token}/selection`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureIds: [...selected] }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        set({ saveState: 'error', saveError: body.error ?? 'Gagal menyimpan.' });
        return;
      }
      set({ saveState: 'saved' });
    } catch {
      set({
        saveState: 'error',
        saveError: 'Koneksi terputus. Perubahan Anda masih tersimpan di layar ini.',
      });
    }
  }, SAVE_DEBOUNCE_MS);

  const persistOptions = debounce(async () => {
    const { payload, platform, deployment, userTier, selectedAddOns, isEditable } = get();
    if (!isEditable) return;
    set({ saveState: 'saving', saveError: null });
    try {
      const response = await fetch(`/api/configurations/${payload.configuration.token}/options`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          deployment,
          userTier,
          addOnIds: [...selectedAddOns],
        }),
      });
      set({ saveState: response.ok ? 'saved' : 'error' });
    } catch {
      set({ saveState: 'error', saveError: 'Koneksi terputus.' });
    }
  }, SAVE_DEBOUNCE_MS);

  /** Menghitung ulang seluruh nilai turunan setelah pilihan berubah. */
  function recompute(partial: Partial<ConfiguratorState>): Partial<ConfiguratorState> {
    const next = { ...get(), ...partial };
    const inputs = buildInputs(next);

    const breakdown = computePrice({
      rule: next.payload.rule,
      features: inputs.features,
      customRequests: inputs.customRequests,
      addOns: inputs.addOns,
      platform: next.platform,
      deployment: next.deployment,
      userTier: next.userTier,
    });

    const minViable = validateMinimumViable(
      next.graph,
      next.selected,
      next.payload.catalog.category.minViableFeatureCount,
      next.payload.catalog.category.shortName,
    );

    const recommendations = collectRecommendations(next.graph, next.selected, 5);

    return { ...partial, breakdown, minViable, recommendations };
  }

  return {
    // Diisi oleh initConfigurator() sebelum komponen dirender.
    payload: null as unknown as ConfiguratorPayload,
    graph: null as unknown as DependencyGraph,
    featureIndex: new Map(),
    groupNameById: new Map(),
    selected: new Set(),
    selectedAddOns: new Set(),
    platform: 'WEB',
    deployment: 'OUR_CLOUD',
    userTier: 'T10',
    customRequests: [],
    breakdown: null as unknown as PriceBreakdown,
    minViable: null as unknown as MinimumViabilityResult,
    recommendations: [],
    activeGroupId: null,
    search: '',
    saveState: 'idle',
    saveError: null,
    notices: [],
    pendingCascade: null,
    startedAt: Date.now(),
    isEditable: true,

    toggleFeature(featureId) {
      const state = get();
      if (!state.isEditable) return;

      const feature = state.featureIndex.get(featureId);
      if (!feature) return;

      // -- Melepas fitur --------------------------------------------------
      if (state.selected.has(featureId)) {
        const result = resolveRemove(state.graph, state.selected, featureId);

        // BR-01: fitur Core tidak dapat dihapus.
        if (result.blockedReason) {
          set({
            notices: [...state.notices, makeNotice('BLOCKED', result.blockedReason)],
          });
          return;
        }

        // C3.4: penghapusan yang menyeret fitur lain wajib dikonfirmasi lebih dulu.
        if (result.cascade.length > 0) {
          set({
            pendingCascade: {
              featureId,
              featureName: feature.name,
              cascade: result.cascade,
            },
          });
          return;
        }

        set(
          recompute({
            selected: result.selected,
            notices: state.notices,
          }),
        );
        track(
          'feature_removed',
          { feature_id: featureId, reason: 'manual' },
          state.payload.configuration.token,
        );
        persistSelection();
        return;
      }

      // -- Menambah fitur -------------------------------------------------
      const result = resolveAdd(state.graph, state.selected, featureId);
      const notices = [...state.notices];

      for (const added of result.added) {
        notices.push(makeNotice('ADDED', added.reason));
        track(
          'dependency_triggered',
          { trigger_feature: featureId, added_feature: added.featureId },
          state.payload.configuration.token,
        );
      }
      for (const removed of result.removed) {
        notices.push(makeNotice('REMOVED', removed.reason));
        track(
          'feature_removed',
          { feature_id: removed.featureId, reason: 'conflict' },
          state.payload.configuration.token,
        );
      }

      const next = recompute({ selected: result.selected, notices: notices.slice(-4) });
      set(next);

      track(
        'feature_added',
        {
          feature_id: featureId,
          cart_total_min: (next.breakdown as PriceBreakdown).totalMin,
          cart_size: result.selected.size,
        },
        state.payload.configuration.token,
      );
      persistSelection();
    },

    confirmCascade() {
      const state = get();
      if (!state.pendingCascade) return;

      const result = resolveRemove(
        state.graph,
        state.selected,
        state.pendingCascade.featureId,
      );

      const notices = [
        ...state.notices,
        makeNotice(
          'REMOVED',
          `“${state.pendingCascade.featureName}” dan ${result.cascade.length} fitur yang bergantung padanya dilepas dari rakitan.`,
        ),
      ];

      track(
        'feature_removed',
        { feature_id: state.pendingCascade.featureId, reason: 'manual' },
        state.payload.configuration.token,
      );
      for (const impact of result.cascade) {
        track(
          'feature_removed',
          { feature_id: impact.featureId, reason: 'cascade' },
          state.payload.configuration.token,
        );
      }

      set(recompute({ selected: result.selected, notices: notices.slice(-4), pendingCascade: null }));
      persistSelection();
    },

    cancelCascade() {
      set({ pendingCascade: null });
    },

    applyPresetLocal(presetId) {
      const state = get();
      if (!state.isEditable) return;
      const preset = state.payload.catalog.presets.find((p) => p.id === presetId);
      if (!preset) return;

      // Preset tetap dinormalkan mesin dependensi agar prasyaratnya lengkap.
      let selected = new Set<string>();
      for (const featureId of preset.featureIds) {
        selected = resolveAdd(state.graph, selected, featureId).selected;
      }
      for (const feature of state.featureIndex.values()) {
        if (feature.type === 'CORE') selected.add(feature.id);
      }

      set(
        recompute({
          selected,
          notices: [
            ...state.notices,
            makeNotice('INFO', `Preset “${preset.name}” diterapkan sebagai titik awal.`),
          ].slice(-4),
        }),
      );
      track(
        'preset_applied',
        { preset: preset.slug, category: state.payload.catalog.category.slug },
        state.payload.configuration.token,
      );
      persistSelection();
    },

    setOption(option) {
      const state = get();
      if (!state.isEditable) return;
      set(recompute(option));
      persistOptions();
    },

    toggleAddOn(addOnId, optionGroup) {
      const state = get();
      if (!state.isEditable) return;
      const next = new Set(state.selectedAddOns);

      if (next.has(addOnId)) {
        next.delete(addOnId);
      } else {
        // Add-on dalam satu kelompok pilihan bersifat tunggal (mis. tingkat
        // migrasi, paket maintenance): memilih yang baru melepas yang lama.
        if (optionGroup) {
          for (const other of state.payload.addOns) {
            if (other.optionGroup === optionGroup) next.delete(other.id);
          }
        }
        next.add(addOnId);
      }

      set(recompute({ selectedAddOns: next }));
      persistOptions();
    },

    setActiveGroup(groupId) {
      set({ activeGroupId: groupId });
    },

    setSearch(value) {
      set({ search: value });
    },

    dismissNotice(id) {
      set({ notices: get().notices.filter((notice) => notice.id !== id) });
    },

    registerCustomRequest(request) {
      const state = get();
      set(recompute({ customRequests: [...state.customRequests, request] }));
    },

    removeCustomRequest(requestId) {
      const state = get();
      set(
        recompute({
          customRequests: state.customRequests.filter((request) => request.id !== requestId),
        }),
      );
    },

    saveNow() {
      persistSelection.flush();
    },

    saveOptionsNow() {
      persistOptions.flush();
    },
  };
});

/**
 * Menyiapkan store dari payload server.
 *
 * Dipanggil sekali saat konfigurator dipasang. Graf dependensi dan indeks fitur
 * dibangun di sini agar setiap perubahan pilihan hanya perlu penelusuran graf,
 * bukan pembangunan ulang — inilah yang menjaga perubahan harga tampil jauh di
 * bawah ambang 200 ms.
 */
export function initConfigurator(payload: ConfiguratorPayload): void {
  const featureIndex = new Map<string, FeatureDTO>();
  const groupNameById = new Map<string, string>();

  for (const group of payload.catalog.groups) {
    groupNameById.set(group.id, group.name);
    for (const feature of group.features) featureIndex.set(feature.id, feature);
  }

  const graph = buildDependencyGraph(
    [...featureIndex.values()].map((feature) => ({
      id: feature.id,
      name: feature.name,
      type: feature.type,
      groupId: feature.groupId,
      isEssential: feature.isEssential,
    })),
    payload.catalog.dependencies,
  );

  const selected = new Set(payload.configuration.selectedFeatureIds);
  const selectedAddOns = new Set(payload.configuration.selectedAddOnIds);

  const inputs = buildInputs({
    payload,
    featureIndex,
    groupNameById,
    selected,
    selectedAddOns,
    customRequests: payload.configuration.customRequests,
  });

  const breakdown = computePrice({
    rule: payload.rule,
    features: inputs.features,
    customRequests: inputs.customRequests,
    addOns: inputs.addOns,
    platform: payload.configuration.platform,
    deployment: payload.configuration.deployment,
    userTier: payload.configuration.userTier,
  });

  useConfigurator.setState({
    payload,
    graph,
    featureIndex,
    groupNameById,
    selected,
    selectedAddOns,
    platform: payload.configuration.platform,
    deployment: payload.configuration.deployment,
    userTier: payload.configuration.userTier,
    customRequests: payload.configuration.customRequests,
    breakdown,
    minViable: validateMinimumViable(
      graph,
      selected,
      payload.catalog.category.minViableFeatureCount,
      payload.catalog.category.shortName,
    ),
    recommendations: collectRecommendations(graph, selected, 5),
    activeGroupId: payload.catalog.groups[0]?.id ?? null,
    search: '',
    saveState: 'idle',
    saveError: null,
    notices: [],
    pendingCascade: null,
    startedAt: Date.now(),
    isEditable: payload.configuration.isEditable,
  });
}

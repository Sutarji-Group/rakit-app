'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  FeatureTypeBadge,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import {
  buildDependencyGraph,
  detectRequiresCycle,
  wouldCreateCycle,
  type DependencyEdge,
  type DependencyFeature,
} from '@/lib/configurator/dependency';
import {
  DEPENDENCY_KINDS,
  DEPENDENCY_KIND_LABEL,
  PUBLISH_STATUS_LABEL,
  type DependencyKind,
  type FeatureType,
  type PublishStatus,
} from '@/lib/domain/enums';
import {
  deleteDependency,
  saveDependency,
} from '@/app/admin/katalog/[categorySlug]/dependensi/actions';
import { PUBLISH_STATUS_VARIANT, collectTransitiveDependents } from './shared';
import { useCatalogAction } from './use-action';

export interface DependencyFeatureItem {
  id: string;
  name: string;
  slug: string;
  type: FeatureType;
  groupId: string;
  groupName: string;
  isEssential: boolean;
  status: PublishStatus;
}

export interface DependencyEdgeItem {
  id: string;
  featureId: string;
  targetFeatureId: string;
  kind: DependencyKind;
  note: string;
}

const KIND_TONE: Record<DependencyKind, 'info' | 'danger' | 'neutral'> = {
  REQUIRES: 'info',
  CONFLICTS_WITH: 'danger',
  RECOMMENDS: 'neutral',
};

const KIND_HELP: Record<DependencyKind, string> = {
  REQUIRES:
    'Prasyarat wajib. Konfigurator menambahkannya otomatis secara transitif saat fitur ini dipilih (C3.1).',
  CONFLICTS_WITH:
    'Saling meniadakan. Memilih salah satunya melepas yang lain, jadi relasi ini selalu berlaku dua arah (C3.2).',
  RECOMMENDS:
    'Saran halus. Tidak pernah menambah fitur secara otomatis, hanya muncul sebagai rekomendasi (C3.3).',
};

/**
 * Editor dependensi visual satu kategori (L3).
 *
 * Kolom terpenting justru yang paling mudah terlupa: daftar fitur yang
 * BERGANTUNG pada fitur terpilih. Arah terbalik itulah yang menentukan dampak
 * cascade saat fitur dihapus atau ditarik dari peredaran, karena rakitan klien
 * yang memakainya akan kehilangan prasyarat.
 */
export function DependencyEditor({
  categorySlug,
  features,
  edges,
  initialFeatureId,
}: {
  categorySlug: string;
  features: DependencyFeatureItem[];
  edges: DependencyEdgeItem[];
  initialFeatureId?: string;
}) {
  const { pending, run } = useCatalogAction();
  const [focusId, setFocusId] = useState<string>(
    initialFeatureId && features.some((feature) => feature.id === initialFeatureId)
      ? initialFeatureId
      : (features[0]?.id ?? ''),
  );
  const [search, setSearch] = useState('');
  const [draftKind, setDraftKind] = useState<DependencyKind>('REQUIRES');
  const [draftTarget, setDraftTarget] = useState('');
  const [draftNote, setDraftNote] = useState('');

  const featureById = useMemo(
    () => new Map(features.map((feature) => [feature.id, feature])),
    [features],
  );

  const graph = useMemo(() => {
    const nodes: DependencyFeature[] = features.map((feature) => ({
      id: feature.id,
      name: feature.name,
      type: feature.type,
      groupId: feature.groupId,
      isEssential: feature.isEssential,
    }));
    const links: DependencyEdge[] = edges.map((edge) => ({
      featureId: edge.featureId,
      targetFeatureId: edge.targetFeatureId,
      kind: edge.kind,
      note: edge.note,
    }));
    return buildDependencyGraph(nodes, links);
  }, [features, edges]);

  const cycle = useMemo(() => detectRequiresCycle(graph), [graph]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return features;
    return features.filter(
      (feature) =>
        feature.name.toLowerCase().includes(needle) ||
        feature.groupName.toLowerCase().includes(needle),
    );
  }, [features, search]);

  if (features.length === 0) {
    return (
      <EmptyState
        title="Belum ada fitur untuk dihubungkan"
        description="Editor ini menghubungkan fitur satu sama lain: mana yang menjadi prasyarat, mana yang saling meniadakan, dan mana yang sekadar disarankan. Tambahkan minimal dua fitur lebih dulu."
        action={
          <Button asChild>
            <Link href={`/admin/katalog/${categorySlug}/fitur/baru`}>Tambah fitur</Link>
          </Button>
        }
      />
    );
  }

  const focus = featureById.get(focusId);
  const outgoing = edges.filter((edge) => edge.featureId === focusId);
  const directDependents = edges.filter(
    (edge) => edge.targetFeatureId === focusId && edge.kind === 'REQUIRES',
  );
  const transitiveDependents = focus
    ? collectTransitiveDependents(graph, focusId).filter(
        (id) => !directDependents.some((edge) => edge.featureId === id),
      )
    : [];

  const cycleRisk =
    focus && draftTarget && draftKind === 'REQUIRES'
      ? wouldCreateCycle(graph, focus.id, draftTarget)
      : false;

  const availableTargets = features.filter(
    (feature) =>
      feature.id !== focusId &&
      !outgoing.some((edge) => edge.targetFeatureId === feature.id && edge.kind === draftKind),
  );

  const submitDraft = () => {
    if (!focus || !draftTarget) return;
    run(
      () =>
        saveDependency({
          featureId: focus.id,
          targetFeatureId: draftTarget,
          kind: draftKind,
          note: draftNote,
        }),
      {
        onSuccess: () => {
          setDraftTarget('');
          setDraftNote('');
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {cycle.hasCycle && (
        <Alert tone="danger" title="Ada lingkaran prasyarat di kategori ini">
          {cycle.cycle.map((id) => featureById.get(id)?.name ?? id).join(' → ')}. Keranjang dengan
          lingkaran prasyarat mustahil diselesaikan — hapus salah satu relasi di rantai tersebut.
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <Card className="lg:sticky lg:top-4 lg:self-start">
          <CardHeader>
            <CardTitle>Pilih fitur</CardTitle>
            <CardDescription>Relasi disusun dari sudut pandang fitur terpilih.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari fitur atau kelompok"
              aria-label="Cari fitur"
            />
            <ul className="max-h-[28rem] overflow-y-auto scrollbar-slim">
              {filtered.map((feature) => {
                const active = feature.id === focusId;
                const outgoingCount = edges.filter(
                  (edge) => edge.featureId === feature.id,
                ).length;
                const incomingCount = edges.filter(
                  (edge) => edge.targetFeatureId === feature.id && edge.kind === 'REQUIRES',
                ).length;
                return (
                  <li key={feature.id}>
                    <button
                      type="button"
                      onClick={() => setFocusId(feature.id)}
                      className={
                        active
                          ? 'w-full rounded-lg border border-brand/30 bg-brand-soft px-3 py-2 text-left'
                          : 'w-full rounded-lg border border-transparent px-3 py-2 text-left hover:bg-surface-sunken'
                      }
                    >
                      <span
                        className={
                          active
                            ? 'block text-sm font-medium text-brand-soft-fg'
                            : 'block text-sm font-medium text-fg'
                        }
                      >
                        {feature.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-fg-subtle">
                        {feature.groupName} · <span className="tabular">{outgoingCount}</span> relasi
                        · <span className="tabular">{incomingCount}</span> bergantung
                      </span>
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-sm text-fg-muted">Tidak ada fitur yang cocok.</li>
              )}
            </ul>
          </CardContent>
        </Card>

        {focus && (
          <div className="flex flex-col gap-5">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{focus.name}</CardTitle>
                  <FeatureTypeBadge type={focus.type} />
                  <Badge variant={PUBLISH_STATUS_VARIANT[focus.status]}>
                    {PUBLISH_STATUS_LABEL[focus.status]}
                  </Badge>
                </div>
                <CardDescription>
                  {focus.groupName} ·{' '}
                  <Link
                    href={`/admin/katalog/${categorySlug}/fitur/${focus.id}`}
                    className="text-brand hover:underline"
                  >
                    buka form fitur
                  </Link>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <RelationMap
                  focusName={focus.name}
                  prerequisites={outgoing
                    .filter((edge) => edge.kind === 'REQUIRES')
                    .map((edge) => featureById.get(edge.targetFeatureId)?.name ?? edge.targetFeatureId)}
                  conflicts={outgoing
                    .filter((edge) => edge.kind === 'CONFLICTS_WITH')
                    .map((edge) => featureById.get(edge.targetFeatureId)?.name ?? edge.targetFeatureId)}
                  dependents={directDependents.map(
                    (edge) => featureById.get(edge.featureId)?.name ?? edge.featureId,
                  )}
                />

                <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
                  <Field label="Jenis relasi">
                    <Select
                      value={draftKind}
                      onChange={(event) => setDraftKind(event.target.value as DependencyKind)}
                    >
                      {DEPENDENCY_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {DEPENDENCY_KIND_LABEL[kind]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Fitur tujuan">
                    <Select
                      value={draftTarget}
                      onChange={(event) => setDraftTarget(event.target.value)}
                      invalid={cycleRisk}
                    >
                      <option value="">Pilih fitur</option>
                      {availableTargets.map((feature) => (
                        <option key={feature.id} value={feature.id}>
                          {feature.groupName} — {feature.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <p className="text-xs leading-relaxed text-fg-subtle">{KIND_HELP[draftKind]}</p>

                <Field
                  label="Catatan penjelas untuk klien"
                  hint="Kalimat ini dibaca klien saat aturan berjalan di konfigurator."
                >
                  <Textarea
                    value={draftNote}
                    onChange={(event) => setDraftNote(event.target.value)}
                    placeholder="Pengambilan barang terpandu butuh peta lokasi rak agar rutenya dapat dihitung."
                  />
                </Field>

                {cycleRisk && (
                  <Alert tone="danger" title="Relasi ini akan membuat lingkaran prasyarat">
                    Fitur tujuan sudah membutuhkan {focus.name}, langsung atau lewat fitur lain.
                    Sistem akan menolak penyimpanannya.
                  </Alert>
                )}

                <div>
                  <Button
                    disabled={!draftTarget || cycleRisk}
                    isLoading={pending}
                    onClick={submitDraft}
                  >
                    Simpan relasi
                  </Button>
                </div>
              </CardContent>
            </Card>

            {DEPENDENCY_KINDS.map((kind) => {
              const rows = outgoing.filter((edge) => edge.kind === kind);
              return (
                <Card key={kind}>
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{DEPENDENCY_KIND_LABEL[kind]}</CardTitle>
                      <Badge variant={KIND_TONE[kind]}>
                        <span className="tabular">{rows.length}</span>
                      </Badge>
                    </div>
                    <CardDescription>{KIND_HELP[kind]}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {rows.length === 0 ? (
                      <p className="text-sm text-fg-muted">
                        Belum ada relasi {DEPENDENCY_KIND_LABEL[kind].toLowerCase()} untuk fitur
                        ini.
                      </p>
                    ) : (
                      <ul className="flex flex-col divide-y divide-border">
                        {rows.map((edge) => {
                          const target = featureById.get(edge.targetFeatureId);
                          return (
                            <li
                              key={edge.id}
                              className="flex flex-wrap items-start gap-3 py-2.5 first:pt-0"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-fg">
                                  {target?.name ?? 'Fitur tidak dikenal'}
                                </p>
                                <p className="text-xs text-fg-subtle">{target?.groupName}</p>
                                <p className="mt-1 max-w-xl text-xs leading-snug text-fg-muted">
                                  {edge.note || 'Belum ada catatan penjelas untuk klien.'}
                                </p>
                              </div>
                              {target && target.status !== 'PUBLISHED' && (
                                <Badge variant="warning">
                                  {PUBLISH_STATUS_LABEL[target.status]}
                                </Badge>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-danger"
                                disabled={pending}
                                onClick={() => run(() => deleteDependency(edge.id))}
                              >
                                Hapus
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            <Card>
              <CardHeader>
                <CardTitle>Fitur yang bergantung pada {focus.name}</CardTitle>
                <CardDescription>
                  Arah terbalik. Inilah yang menentukan dampak cascade bila fitur ini dihapus atau
                  ditarik dari peredaran.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {directDependents.length === 0 && transitiveDependents.length === 0 ? (
                  <p className="text-sm text-fg-muted">
                    Tidak ada fitur lain yang membutuhkannya. Fitur ini aman dihapus tanpa merusak
                    rakitan lain.
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {directDependents.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                          Bergantung langsung
                        </p>
                        <ul className="mt-2 flex flex-col gap-1.5">
                          {directDependents.map((edge) => {
                            const source = featureById.get(edge.featureId);
                            return (
                              <li key={edge.id} className="flex flex-wrap items-center gap-2">
                                <span className="text-sm text-fg">{source?.name ?? edge.featureId}</span>
                                <span className="text-xs text-fg-subtle">{source?.groupName}</span>
                                {source && (
                                  <Badge variant={PUBLISH_STATUS_VARIANT[source.status]}>
                                    {PUBLISH_STATUS_LABEL[source.status]}
                                  </Badge>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {transitiveDependents.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                          Bergantung tidak langsung
                        </p>
                        <ul className="mt-2 flex flex-col gap-1.5">
                          {transitiveDependents.map((id) => {
                            const source = featureById.get(id);
                            return (
                              <li key={id} className="flex flex-wrap items-center gap-2">
                                <span className="text-sm text-fg">{source?.name ?? id}</span>
                                <span className="text-xs text-fg-subtle">{source?.groupName}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Peta relasi satu fitur dalam tiga kolom: prasyarat → fitur → yang bergantung.
 *
 * Dibaca kiri ke kanan sebagai satu rantai: setiap panah berarti "dibutuhkan
 * oleh". Arah inilah yang paling sering tertukar saat membaca daftar teks, dan
 * salah arah berarti salah menilai dampak cascade sebuah penghapusan.
 */
function RelationMap({
  focusName,
  prerequisites,
  conflicts,
  dependents,
}: {
  focusName: string;
  prerequisites: string[];
  conflicts: string[];
  dependents: string[];
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-sunken p-3.5">
      <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)_1.5rem_minmax(0,1fr)]">
        <RelationColumn
          title="Prasyarat"
          caption="Ikut tertarik masuk saat fitur ini dipilih"
          names={prerequisites}
          tone="info"
        />
        <Arrow label="dibutuhkan oleh" />
        <div className="rounded-lg border border-brand/30 bg-brand-soft px-3 py-2 text-center">
          <p className="text-sm font-semibold text-brand-soft-fg">{focusName}</p>
        </div>
        <Arrow label="dibutuhkan oleh" />
        <RelationColumn
          title="Yang bergantung"
          caption="Ikut terdampak bila fitur ini dihapus"
          names={dependents}
          tone="warning"
        />
      </div>

      {conflicts.length > 0 && (
        <p className="mt-3 border-t border-border pt-3 text-xs text-danger-soft-fg">
          Saling meniadakan dengan: {conflicts.join(', ')}.
        </p>
      )}
    </div>
  );
}

function RelationColumn({
  title,
  caption,
  names,
  tone,
}: {
  title: string;
  caption: string;
  names: string[];
  tone: 'info' | 'warning';
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">{title}</p>
      {names.length === 0 ? (
        <p className="text-xs text-fg-subtle">Tidak ada</p>
      ) : (
        <ul className="flex flex-wrap gap-1">
          {names.map((name) => (
            <li key={name}>
              <Badge variant={tone}>{name}</Badge>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-fg-subtle">{caption}</p>
    </div>
  );
}

function Arrow({ label }: { label: string }) {
  return (
    <span
      className="hidden justify-center text-fg-subtle sm:flex"
      aria-label={label}
      title={label}
    >
      <svg viewBox="0 0 24 12" className="w-6" fill="none" aria-hidden="true">
        <path
          d="M1 6h20m0 0-4-4m4 4-4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

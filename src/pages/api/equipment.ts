import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

// Esta ruta debe ejecutarse en el servidor (no se genera en el build)
export const prerender = false;

const STATES = ['Excelente', 'Bueno', 'Regular', 'Dañado', 'No disponible'];
const STATUS_FIELDS = [
  'monitor_status',
  'keyboard_status',
  'mouse_status',
  'ethernet_cable_status',
  'display_port_status',
  'charger_status',
  'lock_status',
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// Crea un equipo nuevo; el id se incrementa solo en la base de datos
export const POST: APIRoute = async () => {
  const { data, error } = await supabase
    .from('computer_equipment')
    .insert({ note: null })
    .select('id')
    .single();

  if (error || !data) {
    console.error('Error al agregar el equipo:', error);
    return json({ error: error?.message ?? 'No se pudo agregar el equipo.' }, 500);
  }

  return json({ id: data.id });
};

// Actualiza un solo campo de un equipo: { id, field, value }
export const PATCH: APIRoute = async ({ request }) => {
  let body: { id?: unknown; field?: unknown; value?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400);
  }

  const { id, field, value } = body;

  if (typeof id !== 'number' || !Number.isInteger(id)) {
    return json({ error: 'Id de equipo inválido.' }, 400);
  }

  const isStatus = typeof field === 'string' && STATUS_FIELDS.includes(field);
  const isNote = field === 'note';

  if (!isStatus && !isNote) {
    return json({ error: 'Campo no permitido.' }, 400);
  }
  if (isStatus && value !== null && !STATES.includes(String(value))) {
    return json({ error: 'Estado no válido.' }, 400);
  }
  if (isNote && value !== null && typeof value !== 'string') {
    return json({ error: 'Nota no válida.' }, 400);
  }

  const { data, error } = await supabase
    .from('computer_equipment')
    .update({ [field as string]: value })
    .eq('id', id)
    .select('id');

  if (error) {
    console.error('Error al actualizar el equipo:', error);
    return json({ error: error.message }, 500);
  }

  // Con RLS, si falta la política UPDATE no hay error, pero tampoco se actualiza ninguna fila
  if (!data || data.length === 0) {
    return json(
      { error: 'No se actualizó ninguna fila. Falta la política UPDATE en Supabase.' },
      403,
    );
  }

  return json({ ok: true });
};

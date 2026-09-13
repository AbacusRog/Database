import { supabase } from './supabaseClient'
import { parseDueDate, computeNextCycle, formatIsoDate } from './dueDates'
import type { DueDateCompletion, DueDateTask } from '../types'

async function currentUserEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.email ?? null
}

/** Advances a task's due date to its next cycle and records the action in
 *  the completion history, so it can be undone later. Throws on failure —
 *  callers are expected to catch and report it. */
export async function markTaskCompleted(
  companyId: string,
  task: DueDateTask,
  currentDueDateIso: string
): Promise<{ newDueDateIso: string; completion: DueDateCompletion }> {
  const nextDate = computeNextCycle(task, parseDueDate(currentDueDateIso))
  const newDueDateIso = formatIsoDate(nextDate)
  const email = await currentUserEmail()

  const { error: updateError } = await supabase
    .from('company_due_dates')
    .upsert({ company_id: companyId, task_type: task, due_date: newDueDateIso }, { onConflict: 'company_id,task_type' })
  if (updateError) throw updateError

  const { data, error: historyError } = await supabase
    .from('company_due_date_completions')
    .insert({
      company_id: companyId,
      task_type: task,
      previous_due_date: currentDueDateIso,
      new_due_date: newDueDateIso,
      completed_by_email: email,
    })
    .select()
    .single()
  if (historyError) throw historyError

  return { newDueDateIso, completion: data as DueDateCompletion }
}

/** Reverts a company_due_dates row back to what it was before the given
 *  completion, and marks that completion record as undone (it stays in
 *  the history rather than being deleted, so the mistake and its
 *  correction are both visible). */
export async function undoCompletion(completion: DueDateCompletion): Promise<void> {
  const email = await currentUserEmail()

  const { error: updateError } = await supabase.from('company_due_dates').upsert(
    { company_id: completion.company_id, task_type: completion.task_type, due_date: completion.previous_due_date },
    { onConflict: 'company_id,task_type' }
  )
  if (updateError) throw updateError

  const { error: undoError } = await supabase
    .from('company_due_date_completions')
    .update({ undone_at: new Date().toISOString(), undone_by_email: email })
    .eq('id', completion.id)
  if (undoError) throw undoError
}

import { TestBed } from '@angular/core/testing';
import { AuthorizationError, InvitationError } from '@core/errors';
import { SupabaseService } from '@core/supabase';
import { TeamService } from './team.service';

/** Cadena de consulta que se resuelve (await) con `result` y registra las llamadas. */
function query(result: unknown) {
  const calls: Record<string, unknown[]> = {};
  const eqs: unknown[][] = [];
  const chain: Record<string, unknown> = {};
  for (const name of ['select', 'eq', 'in', 'order', 'returns', 'update']) {
    chain[name] = (...args: unknown[]) => {
      calls[name] = args;
      if (name === 'eq') eqs.push(args);
      return chain;
    };
  }
  chain['then'] = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return { chain, calls, eqs };
}

describe('TeamService', () => {
  const invoke = vi.fn();
  const from = vi.fn();
  let service: TeamService;

  beforeEach(() => {
    invoke.mockReset();
    from.mockReset();
    TestBed.configureTestingModule({
      providers: [
        { provide: SupabaseService, useValue: { client: { from, functions: { invoke } } } },
      ],
    });
    service = TestBed.inject(TeamService);
  });

  describe('list', () => {
    it('maps active and invited members of the workshop', async () => {
      const { chain, calls } = query({
        data: [
          {
            user_id: 'u1',
            role: 'owner',
            status: 'active',
            invited_at: '2026-11-01',
            joined_at: '2026-11-01',
            user: { full_name: 'Ana', email: 'ana@x.com', phone: '099' },
          },
          {
            user_id: 'u2',
            role: 'mechanic',
            status: 'invited',
            invited_at: '2026-11-02',
            joined_at: null,
            user: null,
          },
        ],
        error: null,
      });
      from.mockReturnValue(chain);

      const members = await service.list('w1');

      expect(from).toHaveBeenCalledWith('workshop_members');
      expect(calls['eq']).toEqual(['workshop_id', 'w1']);
      expect(calls['in']).toEqual(['status', ['active', 'invited']]);
      expect(members[0]).toMatchObject({ userId: 'u1', fullName: 'Ana', email: 'ana@x.com' });
      expect(members[1]).toMatchObject({ status: 'invited', fullName: '', phone: null });
    });

    it('throws a mapped error when the query fails', async () => {
      from.mockReturnValue(query({ data: null, error: { code: '500', message: 'boom' } }).chain);
      await expect(service.list('w1')).rejects.toBeInstanceOf(Error);
    });
  });

  describe('invite', () => {
    const input = {
      email: 'a@x.com',
      fullName: 'Ana',
      phone: '099',
      role: 'advisor' as const,
    };

    it('calls the invite-user function with the data', async () => {
      invoke.mockResolvedValue({ data: {}, error: null });
      await service.invite(input);
      expect(invoke).toHaveBeenCalledWith('invite-user', { body: input });
    });

    it.each([
      ['email_already_registered', 409],
      ['not_owner', 403],
      ['invalid_input', 422],
    ])('turns "%s" into an InvitationError', async (code, status) => {
      invoke.mockResolvedValue({
        data: null,
        error: { context: new Response(JSON.stringify({ error: code }), { status }) },
      });
      await expect(service.invite(input)).rejects.toMatchObject({
        name: 'InvitationError',
        reason: code,
      });
    });

    it('falls back to invitation_failed for unknown or unreadable errors', async () => {
      invoke.mockResolvedValue({ data: null, error: { context: new Response('no json') } });
      await expect(service.invite(input)).rejects.toMatchObject({ reason: 'invitation_failed' });

      invoke.mockResolvedValue({ data: null, error: new Error('network') });
      await expect(service.invite(input)).rejects.toBeInstanceOf(InvitationError);
    });
  });

  describe('cancelInvitation', () => {
    it('sets inactive only while the membership is still invited', async () => {
      const { chain, calls, eqs } = query({ data: [{ user_id: 'u2' }], error: null });
      from.mockReturnValue(chain);
      await service.cancelInvitation('w1', 'u2');
      expect(calls['update']).toEqual([{ status: 'inactive' }]);
      expect(calls['eq']).toEqual(['status', 'invited']);
      expect(eqs).toEqual([
        ['workshop_id', 'w1'],
        ['user_id', 'u2'],
        ['status', 'invited'],
      ]);
    });

    it('reports AuthorizationError when no row was changed', async () => {
      from.mockReturnValue(query({ data: [], error: null }).chain);
      await expect(service.cancelInvitation('w1', 'u2')).rejects.toBeInstanceOf(AuthorizationError);
    });
  });

  describe('changeRole', () => {
    it('updates the role of the membership', async () => {
      const { chain, calls } = query({ data: [{ user_id: 'u2' }], error: null });
      from.mockReturnValue(chain);
      await service.changeRole('w1', 'u2', 'mechanic');
      expect(calls['update']).toEqual([{ role: 'mechanic' }]);
    });

    it('reports AuthorizationError when the database rejects it silently', async () => {
      from.mockReturnValue(query({ data: [], error: null }).chain);
      await expect(service.changeRole('w1', 'u2', 'advisor')).rejects.toBeInstanceOf(
        AuthorizationError,
      );
    });
  });
});

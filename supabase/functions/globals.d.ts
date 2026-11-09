// Tipos mínimos para editar las Edge Functions (corren en Deno, no en Node)
// sin añadir dependencias. Solo declara lo que las funciones usan.

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): unknown;
};

declare module 'npm:@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js';
}

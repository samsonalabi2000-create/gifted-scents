export async function resolve(specifier, context, next) {
  if (specifier === '@prisma/client') return { url: new URL('./prisma-stub.mjs', import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
}

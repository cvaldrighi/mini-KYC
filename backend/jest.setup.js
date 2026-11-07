// Roda antes de cada arquivo de teste, antes dos imports: silencia o Logger do Powertools,
// que senão imprimiria JSON no meio da saída dos testes. Os testes que verificam logs usam jest.spyOn.
process.env.POWERTOOLS_LOG_LEVEL = 'SILENT';

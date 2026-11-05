import { describe, expect, it } from 'vitest';

import { diasRegistrados, estadoDia, type ConsumoMes } from './consumo';

const dia = (fecha: string, bajada: number, suspendido = 0) => ({ fecha, bajada, subida: 0, minutos: 60, suspendido });

describe('estadoDia', () => {
    it('lo que se usó estando suspendido es solo WhatsApp, no consumo normal', () => {
        expect(estadoDia(dia('2026-11-02', 500, 500), '2026-10-01', '2026-11-03')).toBe('solo_whatsapp');
        expect(estadoDia(dia('2026-11-02', 500, 100), '2026-10-01', '2026-11-03')).toBe('uso');
        expect(estadoDia(dia('2026-11-02', 500), '2026-10-01', '2026-11-03')).toBe('uso');
        expect(estadoDia(dia('2026-11-02', 0), '2026-10-01', '2026-11-03')).toBe('sin_uso');
    });

    it('los días de solo WhatsApp cuentan como registrados', () => {
        const consumo: ConsumoMes = {
            mes: '2026-11', dias: [dia('2026-11-01', 0), dia('2026-11-02', 10, 10)],
            total_bajada: 10, total_subida: 0, dias_con_uso: 1, registro_desde: '2026-10-01',
        };
        expect(diasRegistrados(consumo, '2026-11-03')).toBe(2);
    });
});

// Genera un código alfanumérico único para cada socio
export const generateUniqueMemberNumber = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluye caracteres ambiguos como O, 0, I, 1
    let code = 'SOC-';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};
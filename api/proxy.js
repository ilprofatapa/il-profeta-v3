export default async function handler(req, res) {
    try {
        const params = new URLSearchParams(req.query);
        const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxK3GTcWqA4jXbZE-Xs6xn2kcfcmmOGMQhSNjtDTgIwqItFVWpEkpPNbI6erCllH5ZkaA/exec';

        // Prima chiamata — ottieni il redirect
        const url = `${APPS_SCRIPT_URL}?${params.toString()}`;

        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0',
            }
        });

        const text = await response.text();

        // Controlla se è JSON valido
        try {
            JSON.parse(text);
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'application/json');
            res.status(200).send(text);
        } catch {
            // Non è JSON — log per debug
            console.error('Risposta non JSON:', text.substring(0, 200));
            res.status(200).json({ error: 'Risposta non JSON', preview: text.substring(0, 200) });
        }

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
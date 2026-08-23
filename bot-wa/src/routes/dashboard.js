// bot-wa/src/routes/dashboard.js
const path = require('path');
const express = require('express');

/**
 * Endpoint yang merender halaman UI HTML untuk manusia.
 */
function initDashboardRoutes(app, state, helpers) {
    const { requireAuthPage } = helpers;

    app.get('/progres', (req, res) => res.sendFile(path.join(__dirname, '../../public', 'progres.html')));
    app.get('/', requireAuthPage, (req, res) => res.sendFile(path.join(__dirname, '../../halaman', 'dashboard.html')));
    app.get('/home', requireAuthPage, (req, res) => res.sendFile(path.join(__dirname, '../../halaman', 'home.html')));
    app.get('/projek', requireAuthPage, (req, res) => res.sendFile(path.join(__dirname, '../../halaman', 'projek.html')));
    app.get('/update', requireAuthPage, (req, res) => res.sendFile(path.join(__dirname, '../../halaman', 'update.html')));
    app.get('/lomba', (req, res) => res.sendFile(path.join(__dirname, '../../public', 'lomba.html')));
    app.get('/jalankan', requireAuthPage, (req, res) => res.sendFile(path.join(__dirname, '../../halaman', 'jalankan.html')));
    app.get('/antrean', requireAuthPage, (req, res) => res.sendFile(path.join(__dirname, '../../halaman', 'antrean.html')));

    app.get('/laporan', requireAuthPage, (req, res) => {
        res.sendFile(path.join(__dirname, '../../halaman', 'laporan.html'));
    });

    app.get('/laporan/publik', (req, res) => {
        res.sendFile(path.join(__dirname, '../../halaman', 'laporan-publik.html'));
    });

    app.get('/komunitas', requireAuthPage, (req, res) => {
        res.sendFile(path.join(__dirname, '../../halaman', 'komunitas.html'));
    });
}

module.exports = initDashboardRoutes;

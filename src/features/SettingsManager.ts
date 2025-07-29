/* ==========================================================================
   DOSYA 4: src/features/SettingsManager.ts (YENİ DOSYA)
   
   SORUMLULUK: Eklenti ayarlarını okuma ve kaydetme işlemlerini yönetir.
   ========================================================================== */

import * as vscode from 'vscode';
import { EXTENSION_ID, SETTINGS_KEYS, API_SERVICES } from '../core/constants';
import { ApiServiceName } from '../types';

export class SettingsManager {
    public sendConfigToWebview(webview: vscode.Webview) {
        const config = vscode.workspace.getConfiguration(EXTENSION_ID);
        webview.postMessage({
            type: 'loadConfig',
            payload: {
                activeApiService: config.get<ApiServiceName>(SETTINGS_KEYS.activeApiService, API_SERVICES.vllm),
                vllmBaseUrl: config.get<string>(SETTINGS_KEYS.vllmBaseUrl, ''),
                vllmModelName: config.get<string>(SETTINGS_KEYS.vllmModelName, ''),
                geminiApiKey: config.get<string>(SETTINGS_KEYS.geminiApiKey, ''),
                conversationHistoryLimit: config.get<number>(SETTINGS_KEYS.conversationHistoryLimit, 2)
            }
        });
    }

    public async saveSettings(settings: any) {
        const config = vscode.workspace.getConfiguration(EXTENSION_ID);
        try {
            await Promise.all([
                config.update(SETTINGS_KEYS.activeApiService, settings.activeApiService, vscode.ConfigurationTarget.Global),
                config.update(SETTINGS_KEYS.vllmBaseUrl, settings.vllmBaseUrl.trim(), vscode.ConfigurationTarget.Global),
                config.update(SETTINGS_KEYS.vllmModelName, settings.vllmModelName.trim(), vscode.ConfigurationTarget.Global),
                config.update(SETTINGS_KEYS.geminiApiKey, settings.geminiApiKey.trim(), vscode.ConfigurationTarget.Global),
                config.update(SETTINGS_KEYS.conversationHistoryLimit, Number(settings.conversationHistoryLimit) || 2, vscode.ConfigurationTarget.Global)
            ]);
            vscode.window.showInformationMessage('Ayarlar başarıyla kaydedildi.');
        } catch (error) {
            console.error("Failed to save settings:", error);
            vscode.window.showErrorMessage('Ayarlar kaydedilirken bir hata oluştu.');
        }
    }
}
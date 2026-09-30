import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SplashOverlay } from '@shared/ui/splash-overlay';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SplashOverlay],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('traza-fuel');
}

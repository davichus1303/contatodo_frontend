import { Directive, Input, OnDestroy, TemplateRef, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { PermissionAction } from '@core/auth/jwt-claims.model';
import { PermissionService } from '@core/application/permissions/permission.service';

/**
 * Structural directive that only renders its content when the current user
 * holds the required action over the given module link.
 *
 * <p>Usage:</p>
 *
 * <pre>
 * &lt;button *appPermission="'/products'; action: 'create'"&gt;...&lt;/button&gt;
 * &lt;button *appPermission="'/products'"&gt;...&lt;/button&gt;
 * </pre>
 *
 * <p>When the action is omitted it defaults to {@code view}. Root users bypass
 * the check and always see the content.</p>
 */
@Directive({
  selector: '[appPermission]',
  standalone: true
})
export class PermissionDirective implements OnDestroy {
  private link: string | null = null;
  private action: PermissionAction = 'view';
  private rendered = false;
  private subscription: Subscription | null = null;

  constructor(
    private readonly permissionService: PermissionService,
    private readonly templateRef: TemplateRef<unknown>,
    private readonly viewContainer: ViewContainerRef
  ) {}

  @Input()
  set appPermission(link: string) {
    this.link = link;
    this.evaluate();
  }

  @Input()
  set appPermissionAction(action: PermissionAction) {
    this.action = action ?? 'view';
    this.evaluate();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private evaluate(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;

    if (!this.link) {
      this.render(false);
      return;
    }

    this.subscription = this.permissionService
      .hasAccessByLink(this.link, this.action)
      .subscribe((allowed) => this.render(allowed));
  }

  private render(allowed: boolean): void {
    if (allowed && !this.rendered) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.rendered = true;
    } else if (!allowed && this.rendered) {
      this.viewContainer.clear();
      this.rendered = false;
    }
  }
}
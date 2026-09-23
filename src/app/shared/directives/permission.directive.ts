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

  /**
   * Sets the module link the content depends on and reevaluates the check.
   *
   * @param link Module route link, for example {@code '/products'}.
   */
  @Input()
  set appPermission(link: string) {
    this.link = link;
    this.evaluate();
  }

  /**
   * Sets the action the content requires and reevaluates the check.
   *
   * @param action Action to require; when omitted it defaults to {@code view}.
   */
  @Input()
  set appPermissionAction(action: PermissionAction) {
    this.action = action ?? 'view';
    this.evaluate();
  }

  /**
   * Releases the pending permission check to prevent leaks after the
   * directive is destroyed.
   */
  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /**
   * Revalidates the permission and updates the rendered content.
   *
   * <p>A content without a module link renders nothing, failing closed.</p>
   */
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

  /**
   * Renders or removes the embedded view according to the check result.
   *
   * @param allowed Whether the current user is permitted.
   */
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
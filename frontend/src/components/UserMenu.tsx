import { Check, LogOut, Monitor, Moon, Sun, User } from "lucide-react";
import {
  Button,
  Header,
  Menu,
  MenuItem,
  MenuSection,
  MenuTrigger,
  Popover,
  Separator,
  Tooltip,
  TooltipTrigger,
  type Selection,
} from "react-aria-components";
import { initials, personName, useMe, type Me } from "../lib/people";
import { signOut } from "../lib/session";
import { useTheme, type Theme } from "../lib/theme";
import iconStyles from "./IconButton.module.css";
import styles from "./UserMenu.module.css";

const THEMES: { id: Theme; label: string; Icon: typeof Sun }[] = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "System", Icon: Monitor },
];

/** The person's name and email, as text above the menu. A person with no name shows the email once. */
function Who({ me }: { me: Me }) {
  const name = me.name?.trim();
  return (
    <div className={styles.who}>
      <p className={styles.name}>{name || me.email}</p>
      {name && <p className={styles.email}>{me.email}</p>}
    </div>
  );
}

/**
 * The user menu (spec 4.14): the signed-in person's initials at the right end of the top bar.
 * Its menu holds their name and email, the theme, and signing out. If the person can't be
 * loaded, the button shows a person icon and is still there, so signing out still works.
 */
export function UserMenu() {
  const me = useMe();
  const [theme, setTheme] = useTheme();
  if (me.isPending) return <span className={styles.placeholder} aria-hidden="true" />;
  const label = me.data ? `Account: ${personName(me.data)}` : "Account";
  const shown = me.data ? initials(me.data) : "";
  // The name holds both labels a person can see, the tooltip and the initials, so someone
  // using speech input can say either (WCAG 2.5.3).
  const name = shown ? `${label}, ${shown}` : label;

  function choose(keys: Selection) {
    const [chosen] = keys === "all" ? [] : [...keys];
    if (chosen) setTheme(chosen as Theme);
  }

  return (
    <MenuTrigger>
      <TooltipTrigger delay={500} closeDelay={150}>
        <Button aria-label={name} className={styles.button}>
          {shown || <User size={18} aria-hidden="true" />}
        </Button>
        <Tooltip className={iconStyles.tooltip} offset={6}>
          {label}
        </Tooltip>
      </TooltipTrigger>
      <Popover className={styles.popover} placement="bottom end" offset={6}>
        {me.data && (
          <>
            <Who me={me.data} />
            <Separator className={styles.separator} />
          </>
        )}
        <Menu aria-label="Account" className={styles.menu}>
          <MenuSection
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[theme]}
            onSelectionChange={choose}
          >
            <Header className={styles.header}>Theme</Header>
            {THEMES.map(({ id, label: name, Icon }) => (
              <MenuItem key={id} id={id} textValue={name} className={styles.item}>
                {({ isSelected }) => (
                  <>
                    <Icon size={16} aria-hidden="true" />
                    {name}
                    {isSelected && <Check size={16} aria-hidden="true" className={styles.check} />}
                  </>
                )}
              </MenuItem>
            ))}
          </MenuSection>
          <Separator className={styles.separator} />
          <MenuSection aria-label="Session">
            <MenuItem className={styles.item} onAction={() => void signOut()}>
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </MenuItem>
          </MenuSection>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

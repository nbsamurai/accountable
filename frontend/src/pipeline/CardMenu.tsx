import { ChevronDown, ChevronUp, Ellipsis, ExternalLink, Pencil } from "lucide-react";
import { Button, Header, Menu, MenuItem, MenuSection, MenuTrigger, Popover, Separator } from "react-aria-components";
import icons from "../components/IconButton.module.css";
import { STAGES } from "../lib/stages";
import type { CardActions } from "./Card";
import type { CardDeal } from "./queries";
import styles from "./Board.module.css";

export function CardMenu({ deal, actions }: { deal: CardDeal; actions: CardActions }) {
  return (
    <MenuTrigger>
      <Button className={`${icons.button} ${styles.smallIcon}`} aria-label={`More actions for ${deal.name}`}>
        <Ellipsis size={16} aria-hidden="true" />
      </Button>
      <Popover className={styles.menu} placement="bottom end" offset={4}>
        <Menu aria-label={`Actions for ${deal.name}`}>
          <MenuSection>
            <Header className={styles.menuLabel}>Move to</Header>
            {STAGES.filter((stage) => stage.key !== deal.stage).map((stage) => (
              <MenuItem key={stage.key} className={styles.menuItem} onAction={() => actions.moveTo(deal, stage.key)}>
                <span className={`${styles.swatch} ${stage.className}`} aria-hidden="true" /> {stage.name}
              </MenuItem>
            ))}
          </MenuSection>
          <Separator className={styles.separator} />
          <MenuSection aria-label="Order">
            <MenuItem className={styles.menuItem} isDisabled={actions.atBoundary(deal, -1)} onAction={() => actions.reorder(deal, -1)}>
              <ChevronUp size={16} aria-hidden="true" /> Move up
            </MenuItem>
            <MenuItem className={styles.menuItem} isDisabled={actions.atBoundary(deal, 1)} onAction={() => actions.reorder(deal, 1)}>
              <ChevronDown size={16} aria-hidden="true" /> Move down
            </MenuItem>
          </MenuSection>
          <Separator className={styles.separator} />
          <MenuSection aria-label="Deal">
            <MenuItem className={styles.menuItem} onAction={() => actions.open(deal)}><ExternalLink size={16} aria-hidden="true" /> Open</MenuItem>
            <MenuItem className={styles.menuItem} onAction={() => actions.edit(deal)}><Pencil size={16} aria-hidden="true" /> Edit</MenuItem>
          </MenuSection>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

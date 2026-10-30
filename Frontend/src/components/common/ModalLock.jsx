import useModalLock from '../../hooks/useModalLock';

/**
 * Drop inside a modal/overlay: while it is mounted the page behind stops scrolling.
 * For inline modals that have no component of their own to call useModalLock from.
 */
const ModalLock = () => {
  useModalLock(true);
  return null;
};

export default ModalLock;

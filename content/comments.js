function addComment(loc) {
  if (!JR.readerDocument.body.classList.contains("simple-deleting")) {
    JR.readerDocument.body.classList.add("simple-with-comments");
    JR.readerDocument.body.classList.add("simple-commenting");

    // Add the compact comment
    let compactComment = document.createElement("a");
    compactComment.className = "simple-comment-link";
    let commentId = "jr-" + Date.now();
    compactComment.href = "#" + commentId;
    compactComment.innerText = "[*]";
    compactComment.style.top = loc.y + "px";
    compactComment.onclick = linkListener;
    JR.compactComments.appendChild(compactComment);

    // Add the comment
    const commentContainer = document.createElement("div");
    commentContainer.id = commentId;
    commentContainer.className = "simple-comment-container jr-adding";

    const styling = document.createElement("div");
    styling.className = "simple-comment-styling";

    const textarea = document.createElement("textarea");
    textarea.onkeydown = onCommentInput;
    textarea.onkeyup = onCommentInput;
    styling.appendChild(textarea);

    const postBtn = document.createElement("button");
    postBtn.className = "jr-post";
    postBtn.innerText = "Comment";
    postBtn.disabled = true;
    postBtn.onclick = placeComment;
    styling.appendChild(postBtn);

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "cancel";
    cancelBtn.innerText = "Cancel";
    cancelBtn.onclick = cancelComment;
    styling.appendChild(cancelBtn);

    commentContainer.appendChild(styling);

    commentContainer.style.top = loc.y + "px";

    JR.comments.appendChild(commentContainer);

    textarea.focus();
    setTimeout(function () {
      if (JR.readerDocument.body.classList.contains("simple-compact-view"))
        commentContainer.scrollIntoView();
    }, 50);
  }
}

function onCommentInput() {
  if (this.value !== "") {
    this.nextSibling.disabled = false;
  } else {
    this.nextSibling.disabled = true;
  }
  this.style.height = "auto";
  this.style.height = this.scrollHeight + 10 + "px";
}

function placeComment() {
  JR.hasSavedLink = false;
  JR.shareDropdown.classList.remove("active");

  JR.readerDocument.body.classList.remove("simple-commenting");

  const parent = this.parentElement;

  parent.parentElement.classList.remove("jr-adding");
  parent.parentElement.classList.add("jr-posted");

  const date = new Date();
  const dateString =
    date.getMonth() +
    1 +
    "/" +
    date.getDate() +
    "/" +
    date.getFullYear() +
    " at " +
    date.getHours() +
    ":" +
    date.getMinutes();
  const timestamp = document.createElement("div");
  timestamp.className = "jr-timestamp";
  timestamp.innerText = "Left on " + dateString;

  const textarea = parent.querySelector("textarea");

  const comment = document.createElement("p");
  comment.className = "simple-comment";
  comment.innerText = textarea.value;

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-button";
  deleteBtn.innerText = "X";
  deleteBtn.onclick = function () {
    JR.hasSavedLink = false;
    JR.shareDropdown.classList.remove("active");
    const compactRef = JR.readerDocument.querySelector(
      "[href *= " + this.parentElement.parentElement.id + "]"
    );
    compactRef.parentElement.removeChild(compactRef);
    cancelComment(null, parent);
  };

  const backBtn = document.createElement("button");
  backBtn.className = "back-to-ref";
  backBtn.innerText = "↑";
  backBtn.onclick = function () {
    JR.readerDocument.defaultView.scrollTo(0, this.dataset.scrollPos);
  };

  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }

  parent.appendChild(timestamp);
  parent.appendChild(comment);
  parent.appendChild(deleteBtn);
  parent.appendChild(backBtn);

  updateSavedVersion();
}

function cancelComment(e, el) {
  let parent;
  if (el) {
    parent = el.parentElement;
  } else {
    parent = this.parentElement.parentElement;
  }

  parent.parentElement.removeChild(parent);

  if (
    JR.readerDocument.querySelectorAll(".simple-comment-container").length ===
    0
  ) {
    JR.readerDocument.body.classList.remove("simple-with-comments");
  }
  JR.readerDocument.body.classList.remove("simple-commenting");
}

function handlePointerMove(e) {
  let leftEdge, rightEdge;
  if (
    !JR.readerDocument
      .querySelector(".simple-container")
      .classList.contains("rtl")
  ) {
    const edge = JR.readerDocument
      .querySelector(".simple-article-container")
      .getBoundingClientRect().right;
    leftEdge = edge - 70;
    rightEdge = edge + 170;
  } else {
    const edge = JR.readerDocument
      .querySelector(".simple-article-container")
      .getBoundingClientRect().left;
    leftEdge = edge - 170;
    rightEdge = edge + 70;
  }
  const paddingTop = parseInt(
    window
      .getComputedStyle(JR.readerDocument.querySelector(".simple-container"))
      .getPropertyValue("padding-top")
  );
  if (e.clientX > leftEdge && e.clientX < rightEdge) {
    JR.readerDocument.body.classList.add("simple-show-adder");
    JR.addCommentBtn.style.top =
      e.clientY - paddingTop + JR.readerDocument.defaultView.scrollY - 27;
  } else {
    JR.readerDocument.body.classList.remove("simple-show-adder");
  }
}

// Inline comment functionality
function addInlineCommentFunctionality() {
  const MAX_TRIES_PER_DIR = 10;
  const PX_SHIFT_EACH_TRY = 2;
  const NUM_PARENTS_TO_CHECK_FOR_ANCHOR = 10;

  function findClosestPToClick(e) {
    const x = e.pageX;
    const y = e.clientY;
    const above_res = checkNearbyPosForP(
      x,
      y,
      -PX_SHIFT_EACH_TRY,
      MAX_TRIES_PER_DIR
    );
    const above_dist = above_res ? Math.abs(y - above_res.y) : Infinity;
    const below_res = checkNearbyPosForP(
      x,
      y,
      PX_SHIFT_EACH_TRY,
      MAX_TRIES_PER_DIR
    );
    const below_dist = below_res ? Math.abs(y - below_res.y) : Infinity;

    if (above_dist <= below_dist) {
      if (above_dist === 0) {
        const el_height = above_res.el.offsetHeight;
        if (Math.sign(e.offsetY - el_height / 2) < 0) {
          return {
            el: above_res?.el,
            place_before: true,
          };
        }
        return {
          el: above_res?.el,
          place_before: false,
        };
      }
      return {
        el: above_res?.el,
        place_before: false,
      };
    }
    return {
      el: above_res?.el,
      place_before: true,
    };
  }

  function checkNearbyPosForP(x, y, shift, num_tries) {
    const elementsFromPoint = JR.readerDocument.elementsFromPoint(x, y);
    // Make sure we're not nesting the comment
    if (
      elementsFromPoint.some((el) => el.classList.contains("jr-inline-comment"))
    )
      return;

    const p = elementsFromPoint[0]?.closest("p");
    if (p) return { el: p, y };
    if (num_tries > 1) {
      return checkNearbyPosForP(x, y + shift, shift, --num_tries);
    }
    return;
  }

  const format_content_editable = () =>
    JR.readerDocument.execCommand("formatBlock", false, "p");

  function insertComment({ el, place_before }) {
    const comment_container = JR.readerDocument.createElement("div");
    comment_container.className = "jr-user-content-section";

    const tryToDeleteComment = () => {
      if (
        comment_container.innerText.trim() === "X" ||
        window.confirm("Really delete this comment?")
      ) {
        comment_container?.parentElement.removeChild(comment_container);
      }
    };

    const content = JR.readerDocument.createElement("div");
    content.className = "jr-user-content";
    content.setAttribute("contentEditable", true);
    comment_container.appendChild(content);

    const delete_button = JR.readerDocument.createElement("button");
    delete_button.className = "jr-user-content-delete";
    delete_button.innerText = "X";
    delete_button.ariaLabel = "Delete comment";
    delete_button.addEventListener("click", tryToDeleteComment);
    comment_container.appendChild(delete_button);

    content.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        format_content_editable();
      }
    });
    content.addEventListener("blur", (e) => {
      if (content.innerText.trim() === "") {
        tryToDeleteComment();
      }
    });

    if (place_before) {
      el.parentElement.insertBefore(comment_container, el);
    } else {
      el.after(comment_container);
    }

    content.focus();
    format_content_editable();

    comment_container.addEventListener("click", () => {
      content.focus();
      // Move cursor to end
      const range = JR.readerDocument.createRange();
      range.selectNodeContents(content);
      range.collapse(false);
      const selection = JR.readerDocument.defaultView.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });
  }

  JR.readerDocument.addEventListener("click", (e) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    // Make sure it's not just a link being clicked
    function checkForAnchor(el, i) {
      if (!el || i < 0) {
        return false;
      }
      return el.tagName === "A" || checkForAnchor(el.parentElement, --i);
    }
    if (checkForAnchor(e.target, NUM_PARENTS_TO_CHECK_FOR_ANCHOR)) {
      return;
    }

    if (!JR.isPremium) {
      alert(
        "Sorry, this feature is only available to Just Read Premium users! Sign up at justread.link"
      );
      return;
    }

    const res = findClosestPToClick(e);
    if (res.el) {
      insertComment(res);
    }
  });
}
